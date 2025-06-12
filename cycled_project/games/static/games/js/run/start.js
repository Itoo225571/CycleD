import { createBtn,createPopupWindow } from "./drawWindow.js";

export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        this.titleReady = false;  // ← アニメーション完了フラグ

        var TITLE_NAME = 'NIKI  RUN';
        // フェードインしつつ、ゆっくり上下に浮かぶ
        this.title = this.add.text(
            -200, 150, // 画面の左外側から開始
            TITLE_NAME,
            {
                fontFamily: 'DTM-Sans',
                fontSize: '96px',
                color: '#ffffff',           // 文字の色
                stroke: '#444444',          // 縁の色（黒）
                strokeThickness: 8,         // 縁の太さ
                resolution: 2
            }
        ).setOrigin(0.5).setAlpha(0);        
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

        var option = { 
            centerX: true, 
            fontFamily: 'DTM-Sans', 
            fontSize: 64,
            color: 0x4E342E, // 濃い茶色文字
            button: {
                color: 0xD7CCC8, // 薄いベージュ（例: #D7CCC8）
            } 
        };
        var btnList = [
            { y: 300, label: 'Start', callBack: this.goPlayScene.bind(this) },
            { y: 430, label: 'Select  Character', callBack: this.goCharaSelectScene.bind(this) },
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
        this.add.image(0, 0, 'background')
            .setOrigin(0, 0)
            .setDisplaySize(this.game.config.width, this.game.config.height)
            .setDepth(-7);
        const layerConfigs = [
            { key: 'layer1', depth: -6, },
            { key: 'layer2', depth: -5, },
            { key: 'layer3', depth: -4, },
            { key: 'layer4', depth: -3, }
        ];    
        for (const config of layerConfigs) {
            if (!this.textures.exists(config.key)) continue;    //存在しなかったらスキップ
            this.add.image(0, 0, config.key)
                .setOrigin(0, 0)
                .setDisplaySize(this.game.config.width, this.game.config.height)
                .setDepth(config.depth);
        }

        // 戻るボタン
        this.backButton = this.add.sprite(100, 80, 'inputPrompts', 608)  // (x, y, key, frame)
            .setDisplaySize(48 *3/2, 48)
            .setInteractive({ useHandCursor: true })
            .setFlipX(true)
            .on('pointerdown', this.goBackCycleD.bind(this));
        // ホバー時の色変更（マウスオーバー）
        this.backButton.on('pointerover', () => {
            this.backButton.setTint(0x44ff44);  // ホバー時に緑色に変更
        });
        this.backButton.on('pointerout', () => {
            this.backButton.clearTint();  // 色を元に戻す
        });

        // helpボタン
        this.helpButton = this.add.sprite(this.cameras.main.width - 100, 80, 'inputPrompts', 436)
            .setDisplaySize(72, 72)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.sound.add('buttonSoftSound',{volume: 1.2}).play();
            })
            .on('pointerdown', this.showHelpText.bind(this));
        // ホバー時の色変更（マウスオーバー）
        this.helpButton.on('pointerover', () => {
            this.helpButton.setTint(0xFFFF00);  // ホバー時に緑色に変更
        });
        this.helpButton.on('pointerout', () => {
            this.helpButton.clearTint();  // 色を元に戻す
        });

        // クレジット表示（画面右下に小さく）
        this.creditText = this.add.text(
            this.scale.width - 10, 
            this.scale.height - 10, 
            '効果音：OtoLogic', 
            {
                fontSize: '14px',
                color: '#cccccc'
            }
        ).setOrigin(1, 1).setAlpha(0.6);
        this.creditText.setInteractive({ useHandCursor: true });
        this.creditText.on('pointerdown', () => {
            window.open('https://otologic.jp', '_blank');
        });

        // rankingSceneが起動中だったら停止する
        if (this.scene.isActive('RankingScene')) this.scene.stop('RankingScene');
    }

    goPlayScene() {
        this.scene.start('PlayScene');
    }
    goCharaSelectScene() {
        this.scene.start('SelectCharacterScene');
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

    goBackCycleD() {
        const popup = createPopupWindow(this, {
            x: this.game.config.width / 2,  // 画面の中央X座標
            y: this.game.config.height / 2, // 画面の中央Y座標
            width: this.game.config.height * 2/3 * 1.618,
            height: this.game.config.height * 2/3,
            header: 'Exit',
            message: `ゲームを終了しますか？`,
            showCancel: true,
            onOK: () => goCycleD(),
        });
        const goCycleD = () => {
            if (this._isExiting) return;
            this._isExiting = true;
        
            this.cameras.main.fadeOut(100, 0, 0, 0); // 暗転
        
            this.cameras.main.once('camerafadeoutcomplete', () => {
                setTimeout(() => {
                    this.game.destroy(true);
                    window.location.replace(url_CycleD);
                }, 100)}
            );
        };
    }

    showHelpText() {
        var msg = `・障害物にぶつからないように走ろう！\n・タップか Enter キーでジャンプ！\n・銅コインを100枚集めると特別な力が使える！\n・[color=#ffd700]ちゃりニキで日記を書くと、\n　キャラ交換に使える金コインがもらえるよ！[/color]`;
        const popup = createPopupWindow(this, {
            x: this.game.config.width / 2,  // 画面の中央X座標
            y: this.game.config.height / 2, // 画面の中央Y座標
            width: this.game.config.height * 2/3 * 1.618,
            height: this.game.config.height * 2/3,
            header: 'ゲ〜ム説明',
            message: msg,
        });
    }
    
}
