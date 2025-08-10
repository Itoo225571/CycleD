import { createPopupWindow } from "../drawWindow.js";

export class EqBox extends Phaser.GameObjects.Container {
    constructor(scene, x, y, size, gachaResult) {
        super(scene, x, y);

        this.scene = scene;
        this.size = size;
        this.isOpening = false;
        this.isOpened = false;
        this.gachaResult = gachaResult;           // 中身のデータ
        this.appRarity = 'R';                   // 見た目のレアリティ

        // !ボックス        
        this.frontBox = scene.add.sprite(0, 0, 'monochroTiles', 7)
            .setDisplaySize(size, size);
        // 条件: レアリティが R または SSR
        if ((gachaResult.rarity === 'SR' || gachaResult.rarity === 'SSR') && Math.random() < 0.5) {
            // 金色にする（16進カラーコード）
            this.frontBox.setTint(0xFFD700); // 金色
            this.appRarity = 'SR';
        } else if (gachaResult.rarity === 'SSR' && Math.random() < 0.5) {
            this.rainbowEvent = this.startRainbowEffect(this.frontBox);
            this.appRarity = 'SSR';
        }

        // 裏
        this.backBox = scene.add.sprite(0, 0, 'monochroTiles', 90)
            .setAlpha(0)
            .setDisplaySize(size, size);     

        // 黒背景
        this.eqRect = scene.add.sprite(0, 0, 'monochroTilesBrack', 0)
            .setAlpha(1)
            .setDisplaySize(size * 5/6, size * 5/6);

        // 中身
        this.equipment = scene.add.sprite(0, 0, 'monochroTiles', 7)
            .setAlpha(0)
            .setDisplaySize(size / 2, size / 2);

        this.hitArea = this.scene.add.zone(0, 0, size, size)
            .setInteractive();        

        this.add([this.eqRect, this.backBox, this.equipment, this.frontBox, this.hitArea]);

        // イベント設定
        this.hitArea.on('pointerover', () => {
            // if (!this.isOpened) return;
            scene.input.setDefaultCursor('pointer');
        });
        this.hitArea.on('pointerout', () => {
            // if (!this.isOpened) return;
            scene.input.setDefaultCursor('default');
        });
    }

    _preopen() {
        return new Promise(resolve => {
            this.hitArea.disableInteractive();
            if (this.appRarity != this.gachaResult.rarity) {
                this.frontBox.setAlpha(0);
                if (this.gachaResult.rarity === 'SR') {
                    this.frontBox.setTint(0xFFD700); // 金色
                    this.appRarity = 'SR';
                } else if (this.gachaResult.rarity === 'SSR') {
                    this.rainbowEvent = this.startRainbowEffect(this.frontBox);
                    this.appRarity = 'SSR';
                }
                this.scene.tweens.add({
                    targets: this.frontBox,
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.frontBox.setAlpha(1);
                        this.scene.time.delayedCall(1000, () => {
                            this.hitArea.setInteractive();
                            resolve();
                        });
                    }
                });
            } else {
                // すでに同じレアリティなら即座にresolve
                this.hitArea.setInteractive();
                resolve();
            }
        });
    }    

    // 開ける
    async open() {
        if (this.isOpening) return;
        await this._preopen();  // ここで待つ

        this.scene.sfxManager.play('blockSound');
        const { equipment, eqRect, frontBox, backBox, hitArea } = this;
        const rarityColors = {
            'R': 0xffffff,
            'SR': 0xffd700,
            'SSR': 0xffffff
        };
        equipment.setTexture(this.gachaResult.imgKey, this.gachaResult.frame);

        this.isOpening = true;
        backBox.setTint(rarityColors[this.gachaResult.rarity]);
        eqRect.setAlpha(0);
        this.scene.tweens.chain({
            targets: frontBox,
            tweens: [
                {
                    y: -50, duration: 50, ease: 'Sine.easeInOut'
                },
                {
                    y: 30, duration: 100, ease: 'Sine.easeInOut',
                    onStart: () => {
                        equipment.setAlpha(1);
                        this.scene.tweens.add({
                            targets: [equipment, eqRect, backBox, hitArea],
                            y: - (this.size + 20),
                            duration: 100,
                            ease: 'Sine.easeInOut',
                        });                          
                    }
                },
                {
                    y: 0, duration: 50, ease: 'Sine.easeInOut',
                    onStart: () => {
                        // ここで絵柄変更
                        frontBox.setFrame(9);
                        this.frontBox.clearTint();
                        if (this.rainbowEvent) {
                            this.rainbowEvent.remove();
                            this.rainbowEvent = null;
                        }
                    },
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: frontBox,
                            alpha: 0,
                            duration: 500,       // フェードイン時間（ミリ秒）
                            ease: 'Linear'       // イージング（好みで変えてOK）
                        });
                        if (this.gachaResult.rarity === 'SSR') {
                            this.scene.time.delayedCall(200, () => {
                                this.scene.tweens.add({
                                    targets: [equipment],
                                    displayWidth: this.size*1.5,
                                    displayHeight: this.size*1.5,
                                    duration: 500,
                                    yoyo: true,
                                    ease: 'Power1',
                                    onComplete: () => {
                                        this.scene.tweens.add({
                                            targets: [eqRect,backBox],
                                            alpha: 1,
                                            duration: 500,       // フェードイン時間（ミリ秒）
                                            ease: 'Linear'       // イージング（好みで変えてOK）
                                        });
                                        this.rainbowEvent = this.startRainbowEffect(this.backBox);
                                        openCompleted();
                                    }
                                });
                            });
                        } else {
                            this.scene.tweens.add({
                                targets: [eqRect,backBox],
                                alpha: 1,
                                duration: 500,       // フェードイン時間（ミリ秒）
                                ease: 'Linear'       // イージング（好みで変えてOK）
                            });
                            openCompleted();
                        }
                    }
                },
            ]
        });
        
        const openCompleted = () => {
            eqRect.setAlpha(1);
            this.scene.time.delayedCall(200, () => {
                this.scene.tweens.add({
                    targets: [equipment, eqRect, backBox, hitArea],
                    y: 0,
                    duration: 1000,
                    ease: 'Sine.easeInOut',
                });
            });
            this.isOpening = false;
            this.isOpened = true;
            this.emit('opened');
        }
        
    }

    startRainbowEffect(target) {
        let hue = 0;
        const event = this.scene.time.addEvent({
            delay: 10,
            loop: true,
            callback: () => {
                hue += 1;
                if (hue > 360) hue = 0;
                const rgb = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1).color;
                target.setTint(rgb);
            }
        });
        return event;
    }

    showResult() {
        var scene = this.scene;
        var msg = `${this.gachaResult.eqDescription1}\n\n[color=#888888]${this.gachaResult.msg}[/color]`;
        createPopupWindow(scene, {
            x: scene.game.config.width / 2,  // 画面の中央X座標
            y: scene.game.config.height / 2, // 画面の中央Y座標
            width: scene.game.config.height * 2/3 * 1.618,
            height: scene.game.config.height * 2/3,
            header: this.gachaResult.name,
            message: msg,
        });
    }

    // リセットの際に、中身のgachaResultを渡す
    reset(gachaResult) {
        this.isOpened = false;
        this.gachaResult = gachaResult;
        this.box.setAlpha(1);
        this.box.clearTint();
        this.equipment.setAlpha(0);
        this.appRarity = 'R'

        if (this.rainbowEvent) {
            this.rainbowEvent.remove();
            this.rainbowEvent = null;
        }
    }

    destroy() {
        if (this.rainbowEvent) {
            this.rainbowEvent.remove();
            this.rainbowEvent = null;
        }
        super.destroy();
    }
    
}
