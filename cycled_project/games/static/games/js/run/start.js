export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        // タイトル表示
        this.add.text(240, 150, '🎮 My Game Title', {
            fontSize: '48px',
            color: '#ffffff'
        });

        // スタートボタン風テキスト
        const startText = this.add.text(320, 300, '▶ スタート', {
            fontSize: '32px',
            color: '#00ff00'
        });

        startText.setInteractive({ useHandCursor: true });

        startText.on('pointerdown', () => {
            this.scene.start('PlayScene');
        });

        // ホバー時に色変えたりもできる
        startText.on('pointerover', () => {
            startText.setStyle({ fill: '#ffff00' });
        });
        startText.on('pointerout', () => {
            startText.setStyle({ fill: '#00ff00' });
        });
    }
}
