import { gameOptions } from './config.js';

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

        // キャラ画像生成
        for (let i = 0; i < this.characterKeys.length; i++) {
            const key = this.characterKeys[i];
            const sprite = this.add.sprite(0, 0, key + 'Idle').setInteractive({ useHandCursor: true });

            sprite.on('pointerdown', () => {
                this.selectedIndex = i;
                this.updateCarousel();
            });

            this.characterSprites.push(sprite);
        }

        this.updateCarousel();

        // キーボードでも選択可
        this.input.keyboard.on('keydown-LEFT', () => {
            this.selectedIndex = (this.selectedIndex - 1 + this.characterKeys.length) % this.characterKeys.length;
            this.updateCarousel();
        });

        this.input.keyboard.on('keydown-RIGHT', () => {
            this.selectedIndex = (this.selectedIndex + 1) % this.characterKeys.length;
            this.updateCarousel();
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            console.log("Selected character:", this.characterKeys[this.selectedIndex]);
        });
    }

    updateCarousel() {
        const total = this.characterSprites.length;
    
        for (let i = 0; i < total; i++) {
            const sprite = this.characterSprites[i];
    
            // 左（-1）、中央（0）、右（+1）のいずれかのオフセット
            const diff = (i - this.selectedIndex + total) % total;
            let relativeIndex = diff;
    
            if (diff > total / 2) {
                relativeIndex = diff - total; // 負の方向にも回す
            }
    
            // 可視範囲外（±1以外）は非表示
            if (Math.abs(relativeIndex) > 1) {
                sprite.setVisible(false);
                sprite.anims.stop();
                continue;
            }
    
            sprite.setVisible(true);
            // アニメーション制御
            const key = this.characterKeys[i];
            if (relativeIndex === 0) {
                if (!sprite.anims.isPlaying || sprite.anims.currentAnim.key !== key + 'Idle') {
                    sprite.play(key + 'Idle'); // 中央キャラだけアニメ再生
                }
            } else {
                sprite.anims.stop(); // 左右は停止
                sprite.setFrame(0);  // 静止画像に戻す（必要に応じて）
            }
    
            // 中央に近いほど大きく・明るく・中央寄り
            const size = relativeIndex === 0 ? 256 : 128;
            const depth = relativeIndex === 0 ? 1.0 : 0.7;
            const alpha = relativeIndex === 0 ? 1.0 : 0.6;
            const x = this.centerX + relativeIndex * 300;
    
            sprite.x = x;
            sprite.y = this.centerY;
            sprite.setDisplaySize(size,size);
            sprite.setAlpha(alpha);
            sprite.setDepth(depth);
        }
    }
    
}
