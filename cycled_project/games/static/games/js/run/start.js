import { createMsgWindow,createBtn } from './preload.js';

export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        var TITLE_NAME = 'NIKI RUN';
        // フェードインしつつ、ゆっくり上下に浮かぶ
        const title = this.add.text(
            -200, 150, // 画面の左外側から開始
            TITLE_NAME, {
                fontFamily: '"Press Start 2P"',
                fontSize: '60px',
                color: '#ffffff',
                resolution: 2
            }).setOrigin(0.5).setAlpha(0).setScale(0.9)
            .setShadow(10, 10, '#660066', 0, true, true);  // ← 影を追加！;
        // アニメーション
        this.tweens.add({
            targets: title,
            x: this.scale.width / 2, // 画面の中央に移動
            alpha: 1,
            scale: 1,
            duration: 500,
            ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: title,
                    y: title.y - 20,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    delay: 500,
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
        var { _ ,hitArea} = createBtn(0,300,this,'Start',option)
        hitArea.on('pointerdown', this.goPlayScene.bind(this));

        var { _ ,hitArea} = createBtn(0,430,this,'Select Character', option)
        hitArea.on('pointerdown', this.goCharaSelectScene.bind(this));

        var { _ ,hitArea} = createBtn(0,560,this,'Ranking', option)
        hitArea.on('pointerdown', this.goRankingScene.bind(this));

        // background
        this.add.image(0, 0, 'sky')
            .setOrigin(0, 0).
            setDisplaySize(this.game.config.width, this.game.config.height)
            .setDepth(-5);

    }

    goPlayScene() {
        this.scene.start('PlayScene');
    }
    goCharaSelectScene() {
        return;
    }
    goRankingScene() {
        this.preScene = 'StartScene';
        this.scene.start('RankingScene');
    }

    
}
