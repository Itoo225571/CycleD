export default class PreStartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreStartScene' });
    }
  
    create() {
        const { width, height } = this.scale;

        this.input.setDefaultCursor('pointer');

        // 背景を薄暗く
        this.cameras.main.setBackgroundColor('#000000');
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

        // 注意テキスト
        this.add.text(width / 2, height / 2 - 80, '音声が流れます\n\n音量と周囲にご注意くださいませ', {
            fontFamily: 'JF-Dot-K14',
            fontSize: '48px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // OKボタン
        this.add.text(width / 2, height / 2 + 80, 'OK', {
            fontFamily: 'DTM-Sans',
            fontSize: '64px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // 画面のどこでもクリックで遷移
        this.input.once('pointerdown', () => {
            this.sound.play('buttonHardSound',{volume: 1.2});
            this.scene.start('StartScene');
        });
    }
}
  