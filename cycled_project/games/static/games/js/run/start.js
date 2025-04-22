import { createMsgWindow,createBtn } from './preload.js';

export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        // タイトル表示
        this.add.text(240, 150, '🎮 My Game Title', {
            fontFamily: 'DotGothic16',
            fontSize: '48px',
            color: '#ffffff',
            resolution: 2
        });

        // スタートボタン風テキスト
        const startText = this.add.text(320, 300, '▶ Start', {
            fontFamily: 'DotGothic16',
            fontSize: '32px',
            color: '#00ff00',
            resolution: 2
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

        var msgs = [
            'NAME: ponny',
            '3日に1度はパンツの前後ろを間違え、5日に1度はパンツの表裏を間違える。'
        ]
        createMsgWindow(this,msgs,0)

        // createBtn(100,100,this,'キャラクター選択', {centerX:true})

    }
}
