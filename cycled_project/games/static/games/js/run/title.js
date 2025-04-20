export default class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // 背景色
        this.cameras.main.setBackgroundColor('#87ceeb');

        // タイトルテキスト
        this.add.text(centerX, centerY - 100, 'スタート画面', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // ボタンテキスト
        const startButton = this.add.text(centerX, centerY, 'Start', {
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor: '#007acc',
            padding: { x: 20, y: 10 },
            align: 'center'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // ホバー時の色変更
        startButton.on('pointerover', () => {
            startButton.setStyle({ backgroundColor: '#005a99' });
        });
        startButton.on('pointerout', () => {
            startButton.setStyle({ backgroundColor: '#007acc' });
        });

        // クリックでゲームシーンへ遷移
        startButton.on('pointerdown', () => {
            this.scene.start('RunScene'); // RunSceneに移動
        });
    }
}
