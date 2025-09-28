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
        this.time.delayedCall(1000, () => {
            this.bgmManager.play('bgmGacha');
        });

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
                this.showGacha(1);
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

        this.cannon = this.add.sprite(0,0, 'CannonFire', 5).setVisible(false);
        // キャノンアニメーション
        if (!this.anims.exists('cannonFireSlow')) {
            this.anims.create({
                key: 'cannonFireSlow',
                frames: [
                    { key: 'CannonFire', frame: 0, duration: 125 },
                    { key: 'CannonFire', frame: 1, duration: 125 },
                    { key: 'CannonFire', frame: 2, duration: 1000 },
                    { key: 'CannonFire', frame: 3, duration: 50 },
                    { key: 'CannonFire', frame: 4, duration: 50 },
                    { key: 'CannonFire', frame: 5, duration: 50 },
                ],
                repeat: 0
            });
        }
        if (!this.anims.exists('cannonFire')) {
            this.anims.create({
                key: 'cannonFire',
                frames: [
                    { key: 'CannonFire', frame: 0, duration: 125 },
                    { key: 'CannonFire', frame: 1, duration: 125 },
                    { key: 'CannonFire', frame: 2, duration: 100 },
                    { key: 'CannonFire', frame: 3, duration: 50 },
                    { key: 'CannonFire', frame: 4, duration: 50 },
                    { key: 'CannonFire', frame: 5, duration: 50 },
                ],
                repeat: 0
            });
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
        }).setOrigin(0.5,0.5).setVisible(false);
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
        this.selectText.setText('FIRE THE CANNON');
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

        // キャノン砲
        var canonSize = num === 1 ? size : size * 1.5;
        var width = canonSize * 4 * 40/26;
        var height = canonSize * 4;
        var posX = this.areaWidth/2;
        var posY = startY;
        // 既存のキャノンを再利用
        this.gachaArea.add(this.cannon);
        this.cannon.setVisible(true)
            .setAlpha(1)
            .setDisplaySize(width, height)
            .setPosition(posX, -this.areaHeight);

        // box
        for (let i = 0; i < num; i++) {
            const x = startX + i * spacing;
            const itemContainer = new EqBox(this,posX-canonSize*2-10,posY,size,results[i]).setVisible(false);
            itemContainer.postX = x;
            itemContainer.postY = startY;
            itemContainer.canOpen = false;

            itemContainer.hitArea.on('pointerdown', () => {
                // 終了していない場合、カードをめくる or その内容を見せる
                this.isSelecting = true;
                if (itemContainer.isOpened) {
                    this.sfxManager.play('buttonSoftSound');
                    itemContainer.showResult();
                } else {
                    itemContainer.open();
                }
                itemContainer.once('opened', () => {
                    var flippedCount = this.eqBoxes.filter(box => box.isOpened || box.isOpening).length;
                    if (flippedCount >= num) {
                        postOpening();
                    }
                });
            });

            this.eqBoxes.push(itemContainer);
            this.gachaArea.addAt(itemContainer, 0); // インデックス0に追加（最前面ではなく一番奥）
        }

        // skipボタン
        var skipWidth = 96;
        var skipHeight = 96;
        var skipX = this.areaWidth - 100;
        var skipY = 80;
        if (!this.skipButton || !this.skipButton.active) {
            // 初回作成
            this.skipButton = this.add.sprite(skipX, skipY, 'inputPrompts', 269)
                .setDisplaySize(skipWidth, skipHeight)
                .setInteractive({ useHandCursor: true })
                .setVisible(false)
                .setAlpha(1)
                .on('pointerdown', async () => {
                    this.isSelecting = true;
                    this.cannon.setAlpha(0);
                    this.selectText.setVisible(false);
            
                    const targets = this.eqBoxes.filter(eqBox => !eqBox.isOpened && !eqBox.isOpening);
                    this.input.enabled = false;
                            
                    for (const eqBox of targets) {
                        eqBox.setVisible(true);
                        await new Promise(resolve => {
                            eqBox.once('opened', () => resolve());
                            eqBox.open();
                        });
                        await new Promise(resolve => this.time.delayedCall(10, resolve));
                    }
            
                    this.input.enabled = true;
                    postOpening();
                });
            this.gachaArea.add(this.skipButton);
        } else {
            // 既存ボタンを再利用
            this.skipButton.setVisible(false)
                .setDisplaySize(skipWidth, skipHeight)
                .setPosition(skipX, skipY);
        }
        this.gachaArea.setVisible(true);

        // キャノン砲を押したらガチャスタート
        this.resultsNum = num;  // 非同期処理のためにthisに入れる
        // 落下アニメーション
        this.tweens.add({
            targets: this.cannon,
            y: posY,
            duration: this.resultsNum === 1 ? 1300 : 1100,
            ease: 'Quart.easeIn',
            onStart: () => {
                var sound = this.resultsNum === 1 ? 'fallingSound' : 'fallingFastSound'
                this.sfxManager.play(sound); // 落下中のSE
            },
            onComplete: () => {
                // 画面振動
                const duration = Math.min(200 + (this.resultsNum * 100), 500);
                const intensity = Math.min(0.01 + (this.resultsNum * 0.01), 0.1);
                this.cameras.main.shake(duration,intensity);
                this.time.delayedCall(100, () => {
                    // this.sfxManager.play('fell2Sound');
                    this.sfxManager.play(this.resultsNum === 1 ? 'fell2Sound' : 'fell3Sound');
                });
                // キャノン砲発射
                this.time.delayedCall(duration + 500, () => {
                    this.canClickCannon = true;
                    this.selectText.setVisible(true);

                    if (!this.fullScreenHitArea || !this.fullScreenHitArea.active) {
                        this.fullScreenHitArea = this.add.rectangle(
                            this.cameras.main.width / 2,
                            this.cameras.main.height / 2,
                            this.cameras.main.width,
                            this.cameras.main.height,
                            0x000000,
                            0 // 完全透明
                        )
                        .setInteractive({ useHandCursor: true })
                        .on('pointerdown', () => {
                            if (!this.canClickCannon) return;
                    
                            this.canClickCannon = false;
                            this.selectText
                                .setVisible(false)
                                .setText(this.resultsNum === 1 ? 'TAP THE BOX' : 'TAP ALL BOXES');
                            this.cannon.play(this.resultsNum === 1 ? 'cannonFire' : 'cannonFireSlow');
                        });
                    } else {
                        // 既に存在 → 再表示
                        this.fullScreenHitArea.setVisible(true).setActive(true);
                    }                    
                    
                });
                
            }
        });

        // キャノン砲のアニメーションに合わせて発射
        this.cannonAnimationUpdateHandler = (anim, frame, gameObject) => {
            if (frame.index < 4) {
                // キャノンをちょっと前後に動かす
                this.tweens.add({
                    targets: this.cannon,
                    x: this.areaWidth/2 + frame.index*15,
                    duration: 100,
                });
            }
            if (frame.index === 4) {
                this.sfxManager.play('cannonFireSound');
                this.tweens.add({
                    targets: this.cannon,
                    x: this.areaWidth/2,
                    y: posY,
                    duration: 100,
                    ease: 'Bounce.easeOut'   // 弾むように落ち着く感じ
                });

                // box を右から左へ tween で移動
                var random_angle = Phaser.Math.RND.pick([90, 180, 270]);
                this.eqBoxes.forEach((box,index) => {
                    box.setVisible(true);
                    this.tweens.chain({
                        targets: box,
                        tweens: [
                            {
                                x: -this.areaWidth /2,
                                y: posY + 100, 
                                duration: 500,
                                angle: -360 - random_angle,
                                ease: 'Power2',
                                onComplete: () => {
                                    this.tweens.add({
                                        targets: this.cannon,
                                        x: this.areaWidth * 3/2,
                                        duration: 1000,
                                        ease: 'Power2',
                                    });
                                }
                            },
                            // 移動
                            {
                                x: this.areaWidth /2, 
                                duration: 1000, 
                                ease: 'Power2',
                            },
                            // 向きを直す
                            {
                                angle: 0, 
                                duration: 200, 
                                ease: 'Power2',
                            },
                            {
                                y: posY, 
                                duration: 200, 
                                ease: 'Power2',
                            },
                            {
                                x: this.resultsNum === 1 ? box.postX : this.areaWidth /2 + (index-5)*10, 
                                y: this.resultsNum === 1 ? box.postY : this.areaHeight /2 + (index-5)*10,
                                duration: this.resultsNum === 1 ? 0 : 100, 
                                ease: 'Power2',
                            },
                            {
                                x: box.postX, 
                                y: box.postY, 
                                duration: this.resultsNum === 1 ? 0 : 1000, 
                                ease: 'Sine.easeInOut',
                                onComplete: () => {
                                    this.isPulling = true;
                                    this.skipButton.setVisible(true);
                                    this.selectText.setVisible(true);
                                    this.fullScreenHitArea.setVisible(false);
                                    box.canOpen = true;                 // 開ける
                                }
                            },
                            
                        ]
                    });
                });
            }
        }
        this.cannon.on('animationupdate', this.cannonAnimationUpdateHandler);

        const postOpening = () => {
            this.isResult = true;
            this.okButton.setVisible(true);
            this.backButton.setVisible(true);
            this.skipButton.setVisible(false);
            this.selectText.setVisible(false);
            this.cannon.off('animationupdate', this.cannonAnimationUpdateHandler);
        }
    }
    postPullGacha(){
        this.isPulling = false;
        this.backButton.setVisible(true);
        this.pullButton1st.setVisible(true);
        this.pullButton2nd.setVisible(true);
        this.okButton.setVisible(false);
        this.isSelecting = false;
        this.isResult = false;    // 結果表示画面

        this.gachaArea.setVisible(false);
        // this.gachaArea.removeAll(true);

        // 見た目を戻す
        this.eqBoxes.forEach((eqBox, index)=> {
            eqBox.destroy();
        });
        this.eqBoxes = [];  // 空にもする
    }
    // 抽選本体
    pullGacha(num){
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
                this.time.delayedCall(500, () => {
                    scene.preSelectBox(data.results);
                });
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
