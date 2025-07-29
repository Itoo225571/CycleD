export default class GachaScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GachaScene' });
    }

    create() {
        // 音
        this.bgmManager = this.registry.get('bgmManager');
        this.sfxManager = this.registry.get('sfxManager');
        // bgm停止
        this.bgmManager.stop();

        // 戻るボタン
        this.backButton = this.add.sprite(100, 80, 'inputPrompts', 608)
            .setDisplaySize(48 *3/2, 48)
            .setFlipX(true)  // 水平方向に反転
            .setInteractive({ useHandCursor: true })
            // ホバー時の色変更（マウスオーバー）
            .on('pointerover', () => {
                this.backButton.setTint(0x44ff44);  // ホバー時に緑色に変更
            })
            // ホバーを外した時の色を戻す（マウスアウト）
            .on('pointerout', () => {
                this.backButton.clearTint();  // 色を元に戻す
            })
            .on('pointerdown', () => {
                this.sfxManager.play('buttonSoftSound');
                this.goStartScreen();
            });

    }
    // 「Start画面」に戻る処理
    goStartScreen() {
        // bgm停止
        this.bgmManager.stop();
        this.scene.start('StartScene');
        this.scene.stop();  // 現在のシーンを停止
    }
}