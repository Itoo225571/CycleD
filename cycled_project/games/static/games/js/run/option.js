import { createBtn } from './drawWindow.js';

export default class OptionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionScene' });
    }

    create() {
        // 半透明の黒背景を作成（画面全体を覆う）
        const { width, height } = this.scale;
        this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
            .setOrigin(0)
            .setDepth(0);  // 最背面に置く（ボタンより後ろ）
            
        // PlayScene
        this.PlayScene = this.scene.get('PlayScene');
       
    }
}
