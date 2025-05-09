export default class SelectCharacterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SelectCharacterScene' });
    }

    preload() {
        this.load.json('charaData', jsonPlayers);
    }

    create() {
        const charaData = this.cache.json.get('charaData');
        this.characterConfigs = {};
        for (const chara of charaData) {
            this.characterConfigs[chara.key] = { ...chara };
        }

        this.characterKeys = Object.keys(this.characterConfigs);
        this.characterSprites = [];

        this.centerX = this.cameras.main.width / 2;
        this.centerY = this.cameras.main.height / 2;
        this.selectedIndex = 0;

        this.lastUpdateTime = 0;

        // キャラ画像生成
        for (let i = 0; i < this.characterKeys.length; i++) {
            const key = this.characterKeys[i];
            const sprite = this.add.sprite(0, 0, key + 'Idle').setInteractive({ useHandCursor: true });

            sprite.on('pointerdown', () => {
                this.updateCarousel(i); // 更新時に selectedIndex を渡す
            });

            this.characterSprites.push(sprite);
        }

        this.updateCarousel(this.selectedIndex, false);

        // キーボードでも選択可
        this.input.keyboard.on('keydown-LEFT', () => {
            this.updateCarousel((this.selectedIndex - 1 + this.characterKeys.length) % this.characterKeys.length);
        });

        this.input.keyboard.on('keydown-RIGHT', () => {
            this.updateCarousel((this.selectedIndex + 1) % this.characterKeys.length);
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            console.log("Selected character:", this.characterKeys[this.selectedIndex]);
        });
    }

    updateCarousel(newIndex, withAnimation = true) {
        const animsDuration = 300;
        const currentTime = Date.now();  // 現在の時刻を取得
        // animsDuration以上経過していない場合は実行しない
        if (currentTime - this.lastUpdateTime < animsDuration) {
            return;
        }
        this.lastUpdateTime = currentTime; // 更新時刻を記録

        this.selectedIndex = newIndex; // selectedIndex をここで更新

        const total = this.characterSprites.length;
    
        for (let i = 0; i < total; i++) {
            const sprite = this.characterSprites[i];
            const key = this.characterKeys[i];
    
            // 左（-1）、中央（0）、右（+1）のオフセット計算
            let relativeIndex = (i - this.selectedIndex + total) % total;
            if (relativeIndex > total / 2) relativeIndex -= total;
    
            // 表示パラメータ
            const isCenter = relativeIndex === 0;
            const isVisibleRange = Math.abs(relativeIndex) <= 1;
    
            const targetSize = isCenter ? 256 : 128;
            const targetAlpha = isCenter ? 1.0 : 0.6;
            const targetDepth = isCenter ? 1.0 : 0.7;
            const targetX = isVisibleRange ? this.centerX + relativeIndex * 300 : this.centerX;
            const targetY = this.centerY;
    
            sprite.setDepth(targetDepth);
    
            if (withAnimation) {
                this.tweens.add({
                    targets: sprite,
                    x: targetX,
                    y: targetY,
                    displayWidth: targetSize,
                    displayHeight: targetSize,
                    alpha: isVisibleRange ? targetAlpha : 0,
                    duration: animsDuration,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        if (!isVisibleRange) {
                            sprite.setVisible(false); // アニメ後に非表示
                        }
                    }
                });
            } else {
                sprite.x = targetX;
                sprite.y = targetY;
                sprite.setDisplaySize(targetSize, targetSize);
                sprite.setAlpha(isVisibleRange ? targetAlpha : 0);
                sprite.setVisible(isVisibleRange);
            }
    
            if (isVisibleRange) {
                sprite.setVisible(true);
                if (isCenter) {
                    if (!sprite.anims.isPlaying || sprite.anims.currentAnim.key !== key + 'Idle') {
                        sprite.play(key + 'Idle');
                    }
                } else {
                    sprite.anims.stop();
                    sprite.setFrame(0);
                }
            } else {
                sprite.anims.stop();
            }
        }
    }
}
