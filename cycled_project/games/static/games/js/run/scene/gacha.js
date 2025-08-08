import { createBtn,createPopupWindow,createFrame } from "../drawWindow.js";
import { EqBox } from "../class/EqBox.js";

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
        this.pullButton1st = this.add.container(
            (this.scale.width - width*16) / 3, 
            this.scale.height * 4/5 - height*16/2,
        );
        // テキストを追加
        this.pullText1st = this.add.text(
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
        this.pullFrame1st = createFrame(this,width,height,'msgWindowTile')
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.pullText1st.setColor('#ffff00');  // 色コードで直接指定
                this.pullFrame1st.setTint(0x888888);
            })
            .on('pointerout', ()=>{
                this.pullText1st.setColor('#000000');  // 元の色に戻す
                this.pullFrame1st.clearTint();  // 色を元に戻す
            })
            .on('pointerdown', ()=>{
                this.showGacha();
            });
        this.pullButton1st.add(this.pullFrame1st);  // コンテナに追加
        this.pullButton1st.add(this.pullText1st);  // コンテナに追加

        // x5ガチャ
        this.pullButton2nd = this.add.container(
            (this.scale.width - width*16) *2/3, 
            this.scale.height * 4/5 - height*16/2,
        );
        // テキストを追加
        this.pullText2nd = this.add.text(
            width*16  / 2,
            height*16 / 2,
            'x 10',       // 表示する文字列
            {
                fontFamily: 'DTM-Sans',
                fontSize: '64px',
                color: '#000000',
                align: 'center',
            }
        ).setOrigin(0.5);  // 中央揃え
        this.pullFrame2nd = createFrame(this,width,height,'msgWindowTile')
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.pullText2nd.setColor('#ffff00');  // 色コードで直接指定
                this.pullFrame2nd.setTint(0x888888);
            })
            .on('pointerout', ()=>{
                this.pullText2nd.setColor('#000000');  // 元の色に戻す
                this.pullFrame2nd.clearTint();  // 色を元に戻す
            })
            .on('pointerdown', ()=>{
                this.showGacha(10);
            });
        this.pullButton2nd.add(this.pullFrame2nd);  // コンテナに追加
        this.pullButton2nd.add(this.pullText2nd);  // コンテナに追加

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
        this.eqBoxes = [];
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
        // var areaX = this.scale.width / 6;
        // var areaY = this.scale.height / 6;
        // var areaWidth = this.scale.width * 2/3;
        // var areaHeight = this.scale.height * 2/3;

        this.areaX = 0;
        this.areaY = 0;
        this.areaWidth = this.scale.width;
        this.areaHeight = this.scale.height;

        var gachaArea = this.add.container(this.areaX,this.areaY);

        // マスク用の四角形を作って非表示（ただしmaskとして使う）
        const maskShape = this.add.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(this.areaX, this.areaY, this.areaWidth, this.areaHeight);
        const mask = maskShape.createGeometryMask();
        maskShape.setVisible(false);
        gachaArea.setMask(mask);

        // 文字を作る
        this.selectText = this.add.text(this.areaWidth/2, this.areaHeight/6,'SELECT BOX', {
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
        if (num === 1 || num === 10) {
            this.selectText.setText(num === 1 ? 'SELECT ONE BOX' : 'SELECT ALL BOX');
        } else {
            return;
        }
        this.sfxManager.play('buttonSoftSound');
        this.pullGacha(num);
        return;
    }

    // ボックスを選ぶための前処理
    preSelectBox(results){
        this.backButton.setVisible(false);
        this.pullButton1st.setVisible(false);
        this.pullButton2nd.setVisible(false);

        // 箱を横に並べて追加（中央揃え）
        const num = results.length;
        const spacing = this.areaWidth / (num+1);  // スプライトの幅に合わせた間隔（必要に応じて調整）
        const startX = this.areaWidth / (num+1);
        const startY = this.areaHeight / 2;
        const size = 96;

        for (let i = 0; i < num; i++) {
            const x = startX + i * spacing;
            const itemContainer = new EqBox(this,x,startY,size,results[i]);

            itemContainer.hitArea.on('pointerdown', () => {
                // 終了していない場合、カードをめくる or その内容を見せる
                this.isSelecting = true;
                if (itemContainer.isOpened) {
                    this.sfxManager.play('buttonSoftSound');
                    itemContainer.showResult();
                } else {
                    itemContainer.open();
                }

                var flippedCount = this.eqBoxes.filter(box => box.isOpened || box.isOpening).length;
                if (flippedCount >= num) {
                    postOpening();
                }
            });

            this.eqBoxes.push(itemContainer);
            this.gachaArea.add(itemContainer);
        }

        // skipボタン
        this.skipButton = this.add.sprite(this.areaWidth -100, 80, 'inputPrompts', 269)
            .setDisplaySize(96, 96)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.isSelecting = true;
                this.sfxManager.play('buttonSoftSound');

                const targets = this.eqBoxes.filter(eqBox => !eqBox.isOpened && !eqBox.isOpening);
                // 入力を無効化
                this.input.enabled = false;
                
                targets.forEach((eqBox, i) => {
                    this.time.delayedCall(400 * i, () => {
                        eqBox.open();
                        if (i === targets.length - 1) {
                            // 最後のflipが終わるタイミングで入力を戻す＆end()実行
                            this.time.delayedCall(200, () => {
                                this.input.enabled = true; // 入力有効化
                                postOpening();
                            });
                        }
                    });
                });                                   
            });
        this.gachaArea.add(this.skipButton);   

        this.gachaArea.setVisible(true);

        const postOpening = () => {
            this.isResult = true;
            this.okButton.setVisible(true);
            this.backButton.setVisible(true);
            this.skipButton.setVisible(false);
        }
    }
    postPullGacha(){
        this.isPulling = false;
        this.backButton.setVisible(true);
        this.pullButton1st.setVisible(true);
        this.pullButton2nd.setVisible(true);
        this.gachaArea.setVisible(false);
        this.okButton.setVisible(false);
        this.isSelecting = false;
        this.isResult = false;    // 結果表示画面    

        // 見た目を戻す
        this.eqBoxes.forEach((eqBox, index)=> {
            eqBox.destroy();
        });
        this.eqBoxes = [];  // 空にもする
    }
    // 抽選本体
    pullGacha(num){
        this.isPulling = true;

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
                this.registry.set('userInfo', data.user_info);  //最新に更新
                scene.preSelectBox(data.results);
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
