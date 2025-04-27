import { createBtn } from './preload.js';

export default class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    create() {
        this.postScore();
    }
    
    resumeGame() {
        // もし前回のcountdownTextが残っていたら消す
        if (this.countdownText) {
            this.countdownText.destroy();
        }
        // 既存のカウントダウンイベントが存在している場合はリセット
        if (this.countdownEvent) {
            this.countdownEvent.remove();  // 以前のイベントを停止
        }
        
        // 新たにカウントダウンテキストを追加
        this.countdownText = this.add.text(this.game.config.width / 2, this.game.config.height / 2, '', {
            fontFamily: 'DotGothic16',
            fontSize: '64px',
            fill: '#ffffff'
        }).setOrigin(0.5);
    
        this.pauseButton.setText('⏸'); // ← 再開時は「ポーズ」アイコンに戻す
        this.selfPased = false;

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
                    this.countdownText.setText("Start！");
                    // 1秒後にゲームを再開
                    this.time.delayedCall(1000, () => {
                        this.countdownText.destroy();
                        this.isPaused = false;
                        this.physics.resume();
                        // 画面インタラクションを再有効化
                        this.input.enabled = true;
                    }, null, this);
                    // イベントを停止
                    this.countdownEvent.remove();
                }
            },
            callbackScope: this,
            repeat: 3 // 3回だけ繰り返す
        });

        // 🔄 ポーズ用UIを非表示
        this.pauseOverlay.setVisible(false);
        // まとめてBtn非表示&無効化
        this.resumeBtns.forEach(btn => {
            btn.container.setVisible(false);
            btn.hitArea.disableInteractive();
        });

        this.justPaused = true;
        this.time.delayedCall(50, () => {
            this.justPaused = false;
        });
    }

    // 「Start画面」に戻る処理
    goStartScreen() {
        // イベントリスナーを削除してからシーンを停止
        this.shutdown();
        this.scene.start('StartScene');
        this.scene.stop();  // 現在のシーンを停止
    }
}
