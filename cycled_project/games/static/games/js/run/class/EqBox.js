import { createPopupWindow } from "../drawWindow.js";

export class EqBox extends Phaser.GameObjects.Container {
    constructor(scene, x, y, size, gachaResult) {
        super(scene, x, y);

        this.scene = scene;
        this.size = size;
        this.isFlipping = false;
        this.isFlipped = false;
        this.gachaResult = gachaResult;           // 中身のデータ

        // !ボックス
        this.frontBox = scene.add.sprite(0, 0, 'monochroTiles', 7)
            .setDisplaySize(size, size);

        // 裏
        this.backBox = scene.add.sprite(0, 0, 'monochroTiles', 90)
            .setAlpha(0)
            .setDisplaySize(size, size);     

        // 黒背景
        this.eqRect = scene.add.sprite(0, 0, 'monochroTilesBrack', 0)
            .setAlpha(0)
            .setDisplaySize(size * 2 / 3, size * 2 / 3);

        // 中身
        this.equipment = scene.add.sprite(0, 0, 'monochroTiles', 7)
            .setAlpha(0)
            .setDisplaySize(size / 2, size / 2);

        this.hitArea = this.scene.add.zone(0, 0, size, size)
            .setInteractive();        

        this.add([this.backBox, this.eqRect, this.equipment, this.frontBox, this.hitArea]);

        // イベント設定
        this.hitArea.on('pointerover', () => {
            // if (!this.isFlipped) return;
            scene.input.setDefaultCursor('pointer');
        });
        this.hitArea.on('pointerout', () => {
            // if (!this.isFlipped) return;
            scene.input.setDefaultCursor('default');
        });
    }

    // ひっくり返す
    flip() {
        if (this.isFlipping) return;
        const { equipment, eqRect, frontBox, backBox } = this;
        const rarityColors = {
            'R': 0xffffff,
            'SR': 0xffd700,
            'SSR': 0xffffff
        };
        equipment.setTexture(this.gachaResult.imgKey, this.gachaResult.frame);

        this.isFlipping = true;
        this.scene.tweens.add({
            targets: [equipment, eqRect, frontBox, backBox],
            scaleX: 0,
            scaleY: 10,
            duration: 200,
            yoyo: true,
            onYoyo: () => {
                frontBox.setAlpha(0);
                backBox.setAlpha(1);
                backBox.setTint(rarityColors[this.gachaResult.rarity]);
            },
            onComplete: () => {
                eqRect.setAlpha(1);
                equipment.setAlpha(1);
                if (this.gachaResult.rarity === 'SSR') {
                    eqRect.setAlpha(0);
                    backBox.setAlpha(0);
                    this.scene.time.delayedCall(200, () => {
                        this.scene.tweens.add({
                            targets: [equipment, eqRect, backBox],
                            scale: 10,
                            duration: 500,
                            yoyo: true,
                            ease: 'Power1',
                            onComplete: () => {
                                eqRect.setAlpha(1);
                                backBox.setAlpha(1);
                                this.startRainbowEffect();
                                this.isFlipping = false;
                                this.isFlipped = true;
                            }
                        });
                    });
                } else {
                    this.isFlipping = false;
                    this.isFlipped = true;
                }
            }
        });
    }

    startRainbowEffect() {
        let hue = 0;
        const event = this.scene.time.addEvent({
            delay: 10,
            loop: true,
            callback: () => {
                hue += 1;
                if (hue > 360) hue = 0;
                const rgb = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1).color;
                this.backBox.setTint(rgb);
            }
        });
        this.rainbowEvent = event;
    }

    showResult() {
        var scene = this.scene;
        createPopupWindow(scene, {
            x: scene.game.config.width / 2,  // 画面の中央X座標
            y: scene.game.config.height / 2, // 画面の中央Y座標
            width: scene.game.config.height * 2/3 * 1.618,
            height: scene.game.config.height * 2/3,
            header: this.gachaResult.name,
            message: this.gachaResult.msg ,
        });
    }

    // リセットの際に、中身のgachaResultを渡す
    reset(gachaResult) {
        this.isFlipped = false;
        this.gachaResult = gachaResult;
        this.eqRect.setAlpha(0);
        this.box.setAlpha(1);
        this.box.clearTint();
        this.equipment.setAlpha(0);

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
