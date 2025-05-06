import { createBtn } from './preload.js';

export default class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    create() {
        // 半透明の黒背景を作成（画面全体を覆う）
        const { width, height } = this.scale;
        this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
            .setOrigin(0)
            .setDepth(0);  // 最背面に置く（ボタンより後ろ）
            
        // PlayScene
        this.PlayScene = this.scene.get('PlayScene');

        // ポーズ時のボタンに関するもの
        this.resumeBtns = [];  
        const option = { centerX: true, fontFamily: '"Press Start 2P"' };
        // ボタンラベルとアクションの配列
        var buttons = [
            { label: 'Continue', callback: () => this.resumeGame() },
            { label: 'Re:start', callback: () => this.rePlayGame() },
            { label: 'Exit', callback: () => this.goStartScreen() }
        ];
        // ボタン作成
        buttons.forEach(({ label, callback }) => {
            const { container, hitArea } = createBtn(0, 0, this, label, option);
            container.setDepth(100);
            hitArea.on('pointerdown', () => {
                callback();
            });
            this.resumeBtns.push({ container, hitArea });
        });
        // 等間隔に並べる
        var baseY = 150;
        var spacing = 180;
        this.resumeBtns.forEach((btn, index) => {
            btn.container.y = baseY + spacing * index;
            // btn.container.setVisible(false);
            // btn.hitArea.disableInteractive();
        });

        // カウントダウン(非表示)
        this.countdownText = this.add.text(this.game.config.width / 2, this.game.config.height / 2, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '64px',
            fill: '#ffffff'
        }).setOrigin(0.5).setVisible(false);
    }
    
    resumeGame() {
        // ボタンとオーバーレイを非表示にする
        this.resumeBtns.forEach(btn => {
            btn.container.setVisible(false);  // ボタンを非表示
            btn.hitArea.disableInteractive();  // インタラクションを無効化
        });
        this.overlay.setVisible(false);  // オーバーレイを非表示にする
        this.countdownText.setVisible(true);
    
        let count = 3;
        // 画面インタラクションを無効化
        this.input.enabled = false;
    
        // 1秒ごとにカウントダウン
        this.countdownEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.countdownText.setText(count);
                count--;
                if (count < 0) {
                    // 0以下になったら「スタート！」表示
                    this.countdownText.setText("GO!");
                    // 1秒後にゲームを再開
                    this.time.delayedCall(1000, () => {
                        this.countdownText.setVisible(false);
                        this.scene.bringToTop('PlayScene');
                        this.PlayScene.resumeGame();
                        this.scene.resume('PlayScene');

                        this.scene.stop('PauseScene');      // 停止
                    }, null, this);
                    // イベントを停止
                    this.countdownEvent.remove();
                }
            },
            callbackScope: this,
            repeat: 3 // 3回だけ繰り返す
        });
    }

    rePlayGame() {
        // 現在のプレイシーンを完全に停止して初期化
        this.scene.stop('PlayScene');
        // 自身（PauseScene）も停止
        this.scene.stop();
        // PlayScene を最初から再スタート
        this.scene.start('PlayScene');
    }
    
    // 「Start画面」に戻る処理
    goStartScreen() {
        this.scene.stop('PlayScene');
        this.scene.start('StartScene');
        this.scene.stop();  // 現在のシーンを停止
    }

    onBringToTop() {
        if (this.resumeBtns) {
            this.resumeBtns.forEach(btn => {
                btn.container.setVisible(true);
                // btn.hitArea.setInteractive();
            });
        }
        if(this.overlay) {
            this.overlay.setVisible(true);
        }
        if(this.countdownEvent) this.countdownEvent.destroy();
        if(this.countdownText) this.countdownText.setVisible(false);
    }
}
