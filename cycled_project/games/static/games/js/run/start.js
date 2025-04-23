import { createMsgWindow,createBtn } from './preload.js';

export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        var TITLE_NAME = 'NIKI RUN';
        // フェードインしつつ、ゆっくり上下に浮かぶ
        const title = this.add.text(
            this.scale.width / 2, 150, 
            TITLE_NAME, {
            fontFamily: '"Press Start 2P"',
            fontSize: '60px',
            color: '#ffffff',
            resolution: 2
        }).setOrigin(0.5).setAlpha(0).setScale(0.9);
        // アニメーション
        this.tweens.add({
            targets: title,
            alpha: 1,
            scale: 1,
            duration: 800,
            ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: title,
                    y: title.y - 20,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        // var msgs = [
        //     'NAME: ponny',
        //     '3日に1度はパンツの前後ろを間違え、5日に1度はパンツの表裏を間違える。'
        // ]
        // createMsgWindow(this,msgs,0)

        var option = {centerX:true,fontFamily:'"Press Start 2P"'};
        var {_,hitArea} = createBtn(0,300,this,'Start',option)
        hitArea.on('pointerdown', () => {
            this.scene.start('PlayScene');
        });
        var {_,hitArea} = createBtn(0,430,this,'Choice Character', option)
        hitArea.on('pointerdown', () => {
            this.scene.start('PlayScene');
        });
        var {_,hitArea} = createBtn(0,560,this,'Option', option)
        hitArea.on('pointerdown', () => {
            this.scene.start('PlayScene');
        });
    }
}
