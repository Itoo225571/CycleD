import { createPopupWindow } from './drawWindow.js';

export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionsScene' });
        this.isReady = false;
    }

    create() {
        // 音
        this.bgmManager = this.registry.get('bgmManager');
        this.sfxManager = this.registry.get('sfxManager');
        
        // 戻るボタン
        this.backButton = this.add.sprite(100, 80, 'inputPrompts', 608);  // (x, y, key, frame)
        // ボタンにインタラクションを追加（クリックイベント）
        this.backButton
            .setDisplaySize(48 *3/2, 48)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                sfxManager.play('buttonSoftSound');
            })
            .setFlipX(true)  // 水平方向に反転
            .on('pointerdown', this.goBackScene.bind(this))
            // ホバー時の色変更（マウスオーバー）
            .on('pointerover', () => {
                this.backButton.setTint(0x44ff44);  // ホバー時に緑色に変更
            })
            // ホバーを外した時の色を戻す（マウスアウト）
            .on('pointerout', () => {
                this.backButton.clearTint();  // 色を元に戻す
            });

        const { width, height } = this.scale;
        this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setScrollFactor(0)
            .setDepth(-1);
        this.createDisplay();
        // this.getScores();
        // this.showConfirmPopup();
        this.isReady = true;
    }

    preBackScene() {
        // 非表示にする
        this.overlay.setVisible(false);  // オーバーレイを非表示にする
        this.panel.setVisible(false);
        this.optionsTitle.setVisible(false);
        this.backButton.setVisible(false);
    }
    goBackScene() {
        // previousSceneを取得
        const previousSceneKey = this.scene.get('OptionsScene').data.get('previousScene') || 'StartScene';        
        const previousScene = this.scene.get(previousSceneKey);
        this.preBackScene();    //戻る前に色々非表示にする
        previousScene.onBringToTop()?.();   //戻る前に実行したい関数があれば実行
        this.scene.bringToTop(previousSceneKey);
    }

    onBringToTop() {
        if (!this.isReady)  return;

        this.overlay.setVisible(true);
        this.panel.setVisible(true);
        this.optionsTitle.setVisible(true);
        this.backButton.setVisible(true);

        // 一瞬まつ(panelを取得できるように)
        this.time.delayedCall(10, () => {
            this.getOptions();
        });
    }

    // スコア表示用のメソッド
    createDisplay() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
    
        // テキストの位置を設定
        this.optionsTitle = this.add.text(
            centerX, 90, 
            'OPTION', {
            fontFamily: 'DTM-Sans',
            fontSize: '96px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    
        // スクロールパネル作成
        this.panel = this.rexUI.add.scrollablePanel({
            x: centerX,
            y: centerY + 50,
            width: this.scale.width - 200,
            height: centerY + 100,
        
            scrollMode: 0, // 0=vertical
        
            background: this.add.container(0, 0, [
                this.add.rectangle(0, 0, this.scale.width - 200, centerY + 100, 0x000000),  // 黒背景追加
                this.rexUI.add.ninePatch2({
                    width: this.scale.width - 200,
                    height: centerY + 100,
                    key: 'rankingWindowTile',
                    columns: [16, undefined, 16],
                    rows: [16, undefined, 16],
                    stretchMode: {
                        edge: 'repeat',
                        internal: 'scale'
                    }
                })
            ]),            
        
            panel: {
                child: this.rexUI.add.fixWidthSizer({
                    space: { top: 10, bottom: 10, left: 10, right: 10, item: 10 },
                }),
            },
        
            slider: {
                track: this.add.rectangle(0, 0, 20, 10, 0x555555),
                thumb: this.add.rectangle(0, 0, 20, 40, 0xffffff),
            },
        
            mouseWheelScroller: {
                focus: false,
                speed: 0.1
            },
        
            space: {
                left: 10,
                right: 10,
                top: 10,
                bottom: 10,
                panel: 10,
            }
        })        
        .layout();

        if (!this.isReady)  this.getOptions();   //displayがちゃんと完成してから実行
    }

    showOptions(options) {
        
    }
}

export function getOptions(scene) {
    const options = scene.registry.get('playerOptions');
    $.ajax({
        url: '/games/api/nikirun_options/',
        method: 'GET',
        headers: {
            "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
        },
        success: (options) => {
            this.showOptions(options);
        },
        error: function(xhr, status, error) {
            let msg;
            switch (xhr.status) {
                case 400:
                    const res = xhr.responseJSON;
                    if (res && res.score) {
                        msg = 'オプションに関するエラー: ' + res.score.join(', ');
                    } else {
                        msg = 'リクエストに問題があります: ' + JSON.stringify(res);
                    }
                    break;
                case 401:
                    msg = '認証が必要です。ログインしてください。';
                    break;
                case 403:
                    msg = 'アクセスが拒否されました。権限がありません。';
                    break;
                case 404:
                    msg = 'データが見つかりませんでした。';
                    break;
                case 500:
                    msg = 'サーバー内部でエラーが発生しました。';
                    break;
                default:
                    msg = `不明なエラーが発生しました\n（ステータスコード: ${xhr.status} ）`;
            }
            createPopupWindow(scene, {
                x: scene.game.config.width / 2,  // 画面の中央X座標
                y: scene.game.config.height / 2, // 画面の中央Y座標
                width: scene.game.config.height * 2/3 * 1.618,
                height: scene.game.config.height * 2/3,
                header: 'Error',
                message: msg ,
            });
        },
    });
}