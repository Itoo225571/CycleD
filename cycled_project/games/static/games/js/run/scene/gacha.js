import { createBtn,createPopupWindow,createFrame } from "../drawWindow.js";

export default class GachaScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GachaScene' });
    }

    preload() {
        this.load.spritesheet(
            'frameGacha', 
            `${imgDir}Panel/panel-002.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
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
            .on('pointerover', function(){
                this.setTint(0x44ff44);  // ホバー時に緑色に変更
            })
            // ホバーを外した時の色を戻す（マウスアウト）
            .on('pointerout', function(){
                this.clearTint();  // 色を元に戻す
            })
            .on('pointerdown', ()=>{
                this.sfxManager.play('buttonSoftSound');
                this.goStartScreen();
            });

        // 引く
        var width = 12;
        var height = 6;

        // x1ガチャ
        this.pullButton1 = this.add.container(
            (this.scale.width - width*16) / 3, 
            this.scale.height * 4/5 - height*16/2,
        );
        // テキストを追加
        this.pullText1 = this.add.text(
            width*16 / 2,     // コンテナ内部の中心に表示
            height*16 / 2,
            'x 1',       // 表示する文字列
            {
                fontFamily: 'DTM-Sans',
                fontSize: '64px',
                color: '#000000',
                align: 'center',
            }
        ).setOrigin(0.5);  // 中央揃え
        this.pullFrame1 = createFrame(this,width,height,'msgWindowTile')
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.pullText1.setColor('#ffff00');  // 色コードで直接指定
                this.pullFrame1.setTint(0x888888);
            })
            .on('pointerout', ()=>{
                this.pullText1.setColor('#000000');  // 元の色に戻す
                this.pullFrame1.clearTint();  // 色を元に戻す
            })
            .on('pointerdown', ()=>{
                this.showGacha();
            });
        this.pullButton1.add(this.pullFrame1);  // コンテナに追加
        this.pullButton1.add(this.pullText1);  // コンテナに追加

        // x5ガチャ
        this.pullButton5 = this.add.container(
            (this.scale.width - width*16) *2/3, 
            this.scale.height * 4/5 - height*16/2,
        );
        // テキストを追加
        this.pullText5 = this.add.text(
            width*16  / 2,
            height*16 / 2,
            'x 5',       // 表示する文字列
            {
                fontFamily: 'DTM-Sans',
                fontSize: '64px',
                color: '#000000',
                align: 'center',
            }
        ).setOrigin(0.5);  // 中央揃え
        this.pullFrame5 = createFrame(this,width,height,'msgWindowTile')
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.pullText5.setColor('#ffff00');  // 色コードで直接指定
                this.pullFrame5.setTint(0x888888);
            })
            .on('pointerout', ()=>{
                this.pullText5.setColor('#000000');  // 元の色に戻す
                this.pullFrame5.clearTint();  // 色を元に戻す
            })
            .on('pointerdown', ()=>{
                this.showGacha(5);
            });
        this.pullButton5.add(this.pullFrame5);  // コンテナに追加
        this.pullButton5.add(this.pullText5);  // コンテナに追加

        // ガチャ結果確認ボタン
        this.okButton = this.add.container(
            (this.scale.width - width*16) / 2, 
            this.scale.height * 4/5 - height*16/2,
        );
        // テキストを追加
        this.okText = this.add.text(
            width*16 / 2,     // コンテナ内部の中心に表示
            height*16 / 2,
            'O K',       // 表示する文字列
            {
                fontFamily: 'DTM-Sans',
                fontSize: '64px',
                color: '#000000',
                align: 'center',
            }
        ).setOrigin(0.5);  // 中央揃え
        this.okFrame = createFrame(this,width,height,'msgWindowTile')
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.okText.setColor('#ffff00');  // 色コードで直接指定
                this.okFrame.setTint(0x888888);
            })
            .on('pointerout', ()=>{
                this.okText.setColor('#000000');  // 元の色に戻す
                this.okFrame.clearTint();  // 色を元に戻す
            })
            .on('pointerdown', ()=>{
                this.postPullGacha();
            });
        this.okButton.add(this.okFrame)     // コンテナに追加
            .add(this.okText)               // コンテナに追加
            .setVisible(false);

        // ガチャ
        this.itemContainers = []
        this.gachaArea = this.makeGachaArea();
        this.isPulling = false;                 // ガチャを引くとき
        this.isSelecting = false;               // 箱を選ぶとき
        this.isResult = false;                  // 結果画面
    }

    // 毎フレーム表示切り替えチェック（update内で）
    update() {
        if (!this.isSelecting && this.isPulling) {
            this.selectText.setVisible(true);
        } else {
            this.selectText.setVisible(false);
        }
    }
    
    // 「Start画面」に戻る処理
    goStartScreen() {
        // bgm停止
        this.bgmManager.stop();
        this.scene.start('StartScene');
        this.scene.stop();  // 現在のシーンを停止
    }

    makeGachaArea(){
        var areaX = this.scale.width / 6;
        var areaY = this.scale.height / 6;
        var areaWidth = this.scale.width * 2/3;
        var areaHeight = this.scale.height * 2/3;
        var gachaArea = this.add.container(areaX,areaY);

        // マスク用の四角形を作って非表示（ただしmaskとして使う）
        const maskShape = this.add.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(areaX, areaY, areaWidth, areaHeight);
        const mask = maskShape.createGeometryMask();
        maskShape.setVisible(false);
        gachaArea.setMask(mask);

        // 箱を横に並べて追加（中央揃え）
        const num = 5;

        const spacing = areaWidth / (num+1);  // スプライトの幅に合わせた間隔（必要に応じて調整）
        const startX = areaWidth / (num+1);
        const startY = areaHeight / 2;
        const size = 96;

        for (let i = 0; i < num; i++) {
            const x = i * spacing;
            const eqRect = this.add.sprite(x, 0, 'monochroTilesBrack', 0)
                .setAlpha(0)
                .setDisplaySize(size*2/3, size*2/3)

            const equipment = this.add.sprite(x, 0, 'monochroTiles', 7)
                .setDisplaySize(size/2, size/2)
                .setAlpha(0)
                .on('pointerover', function(){
                    // this.setTint(0xffff00);
                    this.scene.input.setDefaultCursor('pointer');  // 手のカーソルにする
                })
                .on('pointerout', function(){
                    // this.clearTint();  // 色を元に戻す
                    this.scene.input.setDefaultCursor('default');  // 通常カーソルに戻す
                });
                
            const box = this.add.sprite(x, 0, 'monochroTiles', 7)
                .setDisplaySize(size, size)
                .setInteractive()
                .on('pointerover', function(){
                    // if (this.scene.isResult) return;    // 結果表示画面ならば無視
                    // this.setTint(0xffff00);
                    this.scene.input.setDefaultCursor('pointer');  // 手のカーソルにする
                })
                .on('pointerout', function(){
                    // if (this.scene.isResult) return;    // 結果表示画面ならば無視
                    // this.clearTint();  // 色を元に戻す
                    this.scene.input.setDefaultCursor('default');  // 通常カーソルに戻す
                });

            // 順番に格納
            const itemContainer = this.add.container(startX, startY, [eqRect, box, equipment])
                .setSize(size, size);
            box.on('pointerdown', ()=>{
                // if (this.scene.isResult) return;    // 結果表示画面ならば無視
                this.sfxManager.play('buttonSoftSound');
                this.selectBox(itemContainer);
            });
            gachaArea.add(itemContainer); // container を gachaArea に追加

            // this.rects.push(eqRect);
            // this.boxes.push(box);
            // this.equipments.push(equipment);
            this.itemContainers.push(itemContainer);
        }

        // 文字を作る（例）
        this.selectText = this.add.text(areaWidth/2, areaHeight/6,'SELECT BOX', {
            fontFamily: 'DTM-Sans',
            fontSize: '48px',
            color: '#ffffff',
        }).setOrigin(0.5,0.5);
        gachaArea.add(this.selectText);
        // 点滅アニメーションを作成
        this.tweens.add({
            targets: this.selectText,
            alpha: 0,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        gachaArea.setVisible(false);
        return gachaArea;
    }

    // ガチャを引く
    showGacha(num=1){
        if (this.isPulling) return;  // 回転中は無視
        if (num === 1 || num === 5) {
            this.selectText.setText(num === 1 ? 'SELECT ONE BOX' : 'SELECT ALL BOX');
        } else {
            return;
        }
        this.sfxManager.play('buttonSoftSound');
        this.pullGacha(num);
        return;
    }
    // boxの上に抽選されたアイテムを表示する
    selectBox(container){
        if (this.pullNum <= 0 )   return;

        const rect = container.getAt(0);
        const box = container.getAt(1);
        const equipment = container.getAt(2);

        this.isSelecting = true;
        let results = this.pullResults;
        let result = results.pop(); // 1つとりだす
        const rarityColors = {
            'R': 0xffffff,
            'SR': 0xffd700,   // ゴールド
            'SSR': 0xffffff   // 仮設定
        };
        equipment.setTexture(result.imgKey, result.frame)       //eqを変更
            .on('pointerdown', ()=>{
                this.sfxManager.play('buttonSoftSound');
                this.selectEq(result);
            });
        box.on('pointerdown', ()=>{
            this.sfxManager.play('buttonSoftSound');
            this.selectEq(result);
        });        

        this.tweens.add({
            targets: [rect,box,equipment],
            scaleX: 0,
            scaleY: 10,
            duration: 200,
            yoyo: true,
            onYoyo: () => {
                box.setFrame(90);
                box.setTint(rarityColors[result.rarity]);
            },
            onComplete: () => {
                rect.setAlpha(1);
                equipment.setAlpha(1);
                if (result.rarity === 'SSR') {
                    rect.setAlpha(0);
                    box.setAlpha(0);
                    this.time.delayedCall(200, () => {
                        // まず一気にドアップ
                        this.tweens.add({
                            targets: [rect,box,equipment],
                            scale: 10,
                            duration: 500,
                            yoyo: true,    // 拡大後に元に戻す
                            ease: 'Power1',
                            onComplete: () => {
                                // 戻す
                                rect.setAlpha(1);
                                box.setAlpha(1);
                                // ゲーミングさせる
                                let hue = 0;
                                this.rainbowEvent = this.time.addEvent({
                                    delay: 10, // 約33fps
                                    loop: true,
                                    callback: () => {
                                        hue += 1;
                                        if (hue > 360) hue = 0;
                                
                                        const rgb = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1).color;
                                        box.setTint(rgb);
                                    }
                                });
                                // box.setScale(1);  // 念のため元サイズをセット
                            }
                        });
                    })
                }
            }
        });
        this.pullNum = results.length;
        if (this.pullNum <= 0) {
            this.isResult = true;    // 結果表示画面
            this.okButton.setVisible(true);
        }
        return;
    }

    // 装備の内容を表示する
    selectEq(result){
        var scene = this;
        createPopupWindow(scene, {
            x: scene.game.config.width / 2,  // 画面の中央X座標
            y: scene.game.config.height / 2, // 画面の中央Y座標
            width: scene.game.config.height * 2/3 * 1.618,
            height: scene.game.config.height * 2/3,
            header: result.name,
            message: result.msg ,
        });
    }

    preSelectBox(){
        this.backButton.setVisible(false);
        this.pullButton1.setVisible(false);
        this.pullButton5.setVisible(false);
        this.gachaArea.setVisible(true);
    }
    postPullGacha(){
        this.isPulling = false;
        this.backButton.setVisible(true);
        this.pullButton1.setVisible(true);
        this.pullButton5.setVisible(true);
        this.gachaArea.setVisible(false);
        this.okButton.setVisible(false);
        this.pullResults = null;
        this.isSelecting = false;
        this.isResult = false;    // 結果表示画面
        this.rainbowEvent?.remove();  // 完全に削除

        // 見た目を戻す
        this.itemContainers.forEach((container, index)=> {
            const rect = container.getAt(0);
            const box = container.getAt(1);
            const equipment = container.getAt(2);

            box.clearTint();
            box.setFrame(7);
            box.removeAllListeners('pointerdown');
            box.on('pointerdown', ()=>{
                this.sfxManager.play('buttonSoftSound');
                this.selectBox(container);
            });

            equipment.clearTint();
            equipment.setAlpha(0);
            equipment.removeAllListeners('pointerdown');

            rect.setAlpha(0);
        });
    }
    // 抽選本体
    pullGacha(num){
        this.isPulling = true;
        this.pullResults = null;

        // const userInfo = this.registry.get('userInfo');
        // const id = userInfo.id;
        const scene = this;
        $.ajax({
            url: `/games/run/pull_gacha/`,
            type: 'POST',
            contentType: 'application/json',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            data: JSON.stringify({ num: num }),  // ← stringifyが必要
            success: (data) => {
                scene.pullResults = data.results;
                scene.pullNum = data.results.length;
                this.registry.set('userInfo', data.user_info);  //最新に更新
                scene.preSelectBox();
            },
            error: function(xhr, status, error) {
                let response = xhr.responseJSON || {};
                let msg = '';

                switch (xhr.status) {
                    case 400:
                        msg = response.detail || 'リクエストに問題があります。';
                        break;
                    case 402:
                        msg = response.detail || 'コインが足りません。';
                        break;
                    case 404:
                        msg = response.detail || 'ユーザー情報が見つかりません。';
                        break;
                    case 500:
                        console.error('サーバーエラー:', response.detail || error);
                        msg = 'サーバーエラーが発生しました。もう一度お試しください。';
                        break;
                    default:
                        msg = '予期しないエラーが発生しました。';
                }
                const popup = createPopupWindow(scene, {
                    x: scene.game.config.width / 2,  // 画面の中央X座標
                    y: scene.game.config.height / 2, // 画面の中央Y座標
                    width: scene.game.config.height * 2/3 * 1.618,
                    height: scene.game.config.height * 2/3,
                    header: 'Error',
                    message: msg ,
                });
                console.error(msg)
            }
        });
    }
}
