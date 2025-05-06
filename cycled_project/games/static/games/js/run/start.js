import { createMsgWindow,createBtn } from './preload.js';

export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        this.titleReady = false;  // ← アニメーション完了フラグ

        var TITLE_NAME = 'NIKI RUN';
        // フェードインしつつ、ゆっくり上下に浮かぶ
        this.title = this.add.text(
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
            targets: this.title,
            x: this.scale.width / 2, // 画面の中央に移動
            alpha: 1,
            scale: 1,
            duration: 500,
            ease: 'Back.Out',
            onComplete: () => {
                this.titleReady = true;  // ← アニメ完了フラグ立てる
                this.tweens.add({
                    targets: this.title,
                    y: this.title.y - 20,
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

        var option = { centerX: true, fontFamily: '"Press Start 2P"' };
        var btnList = [
            { y: 300, label: 'Start', callBack: this.goPlayScene.bind(this) },
            { y: 430, label: 'Select Character', callBack: this.goCharaSelectScene.bind(this) },
            { y: 560, label: 'Ranking', callBack: this.goRankingScene.bind(this) }
        ];        
        
        btnList.forEach((btn) => {
            // btn.y と btn.label を使う
            let { container, hitArea } = createBtn(0, btn.y, this, btn.label, option);
        
            // 初期状態で透明にする
            container.setAlpha(0);
        
            // 順番にフェードインさせる（100msずつ遅らせて）
            this.tweens.add({
                targets: container,
                alpha: 1,
                duration: 400,
                delay: 500,  // 開始500ms後から順に
                ease: 'Power1',
                onComplete: () => {
                    // フェードインが完了した後に hitArea にイベントをバインド
                    hitArea.setInteractive({ useHandCursor: true });
                    hitArea.on('pointerdown', btn.callBack);
                }
            });
        });
        

        // background
        this.add.image(0, 0, 'sky')
            .setOrigin(0, 0)
            .setDisplaySize(this.game.config.width, this.game.config.height)
            .setDepth(-7);

        // rankingSceneが起動中だったら停止する
        if (this.scene.isActive('RankingScene')) this.scene.stop('RankingScene');
    }

    goPlayScene() {
        this.scene.start('PlayScene');
    }
    goCharaSelectScene() {
        return;
    }
    goRankingScene() {
        if (!this.titleReady) return;  // ← ここで弾く！

        this.scene.get('RankingScene').data.set('previousScene', 'StartScene');
        this.title.setVisible(false);  //titleを隠す
        if (!this.scene.isActive('RankingScene')) {
            this.scene.launch('RankingScene');
        }
        const RankingScene = this.scene.get('RankingScene');
        RankingScene.onBringToTop?.();
        this.scene.bringToTop('RankingScene');
    }
    onBringToTop() {
        this.title.setVisible(true);  //titleを見せる
    }
}
