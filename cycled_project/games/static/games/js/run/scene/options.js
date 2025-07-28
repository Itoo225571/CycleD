import { createPopupWindow } from '../drawWindow.js';

export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionsScene' });
        this.isReady = false;
    }

    create() {
        // options
        this.Options = this.registry.get('playerOptions');

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
                this.sfxManager.play('buttonSoftSound');
            })
            .setFlipX(true)  // 水平方向に反転
            .setDepth(1)
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
            .setDepth(-1)
            .setInteractive();

        // インタラクションブロック用の透明なレイヤー
        // this.hitBlocker = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
        //     .setScrollFactor(0)
        //     .setDepth(-2)              // オーバーレイよりさらに後ろに置く場合はこれより小さい値に
        //     .setInteractive();

        this.createDisplay();
        this.isReady = true;
    }

    preBackScene() {
        // 非表示にする
        this.overlay.setVisible(false);  // オーバーレイを非表示にする
        this.panel.setVisible(false);
        this.panelBackground.setVisible(false);
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
        this.panelBackground.setVisible(true);
        this.optionsTitle.setVisible(true);
        this.backButton.setVisible(true);

        this.Options = this.registry.get('playerOptions');  // optionsを最新にする

        // 一瞬まつ(panelを取得できるように)
        // this.time.delayedCall(10, () => {
        //     this.getOptions();
        // });
    }

    // 画面作成のメソッド
    createDisplay() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
    
        // タイトル
        this.optionsTitle = this.add.text(
            centerX, 90,
            'OPTION',
            {
                fontFamily: 'DTM-Sans',
                fontSize: '96px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);
    
        // パネル背景
        const panelWidth = this.scale.width - 200;
        const panelHeight = centerY + 100;
    
        this.panelBackground = this.add.container(centerX, centerY + 50, [
            this.add.rectangle(0, 0, panelWidth, panelHeight, 0x000000).setOrigin(0.5),
            this.rexUI.add.ninePatch2({
                width: panelWidth,
                height: panelHeight,
                key: 'rankingWindowTile',
                columns: [16, undefined, 16],
                rows: [16, undefined, 16],
                stretchMode: {
                    edge: 'repeat',
                    internal: 'scale'
                }
            }).setOrigin(0.5)
        ]);
    
        // パネル本体（中身配置用）
        this.panel = this.rexUI.add.fixWidthSizer({
            x: centerX,
            y: centerY + 50,
            width: panelWidth - 40, // 内側マージン
            space: { top: 20, bottom: 20, left: 20, right: 20, item: 20 },
        }).layout().setDepth(1);

        this.showOptions();
    }    

    showOptions() {
        const optionsPanel = this.panel;
        optionsPanel.clear();
    
        const optionData = this.Options;
        const numSteps = 5;
    
        for (const [key, value] of Object.entries(optionData)) {
            if (key=== 'fullscreen')    continue;
            // Y方向に縦積みするサブコンテナ
            const row = this.rexUI.add.sizer({
                orientation: 'y',
                space: { item: 10 },
            });
    
            // ラベル
            const label = this.add.text(0, 0, `${key}: ${(value * (numSteps - 1)).toFixed(0) + 1}`, {
                fontSize: '24px',
                color: '#ffffff'
            }).setOrigin(0.5, 0.5);  // ← X・Yとも中央基準
    
            // スライダー
            const slider = this.rexUI.add.slider({
                width: this.panel.width * 0.7,
                height: 20,
                track: this.add.rectangle(0, 0, 0, 0, 0x888888).setOrigin(0.5),
                thumb: this.add.rectangle(0, 0, 20, 40, 0xffffff).setOrigin(0.5),
                value: value,
                gap: 1 / (numSteps - 1),
                valuechangeCallback: (newValue) => {
                    const step = Math.round(newValue * (numSteps - 1));
                    const displayValue = step + 1;
                    this.Options[key] = step / (numSteps - 1);
                    label.setText(`${key}: ${displayValue}`);
    
                    this.registry.set('playerOptions', this.Options);
                    this.bgmManager.updateVolume();
                    this.sfxManager.play('buttonHardSound');
                },
            });
    
            // 各要素を中央に追加
            row.add(label, { align: 'center' });
            row.add(slider, { align: 'center' });
    
            // 全体パネルにも中央に追加
            optionsPanel.add(row, { align: 'center', expand: false });
        }
    
        optionsPanel.layout();
    }    
}

// export function getOptions(scene) {
//     const options = scene.registry.get('playerOptions');
//     $.ajax({
//         url: '/games/api/nikirun_options/',
//         method: 'GET',
//         headers: {
//             "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
//         },
//         success: (options) => {
//             this.showOptions(options);
//         },
//         error: function(xhr, status, error) {
//             let msg;
//             switch (xhr.status) {
//                 case 400:
//                     const res = xhr.responseJSON;
//                     if (res && res.score) {
//                         msg = 'オプションに関するエラー: ' + res.score.join(', ');
//                     } else {
//                         msg = 'リクエストに問題があります: ' + JSON.stringify(res);
//                     }
//                     break;
//                 case 401:
//                     msg = '認証が必要です。ログインしてください。';
//                     break;
//                 case 403:
//                     msg = 'アクセスが拒否されました。権限がありません。';
//                     break;
//                 case 404:
//                     msg = 'データが見つかりませんでした。';
//                     break;
//                 case 500:
//                     msg = 'サーバー内部でエラーが発生しました。';
//                     break;
//                 default:
//                     msg = `不明なエラーが発生しました\n（ステータスコード: ${xhr.status} ）`;
//             }
//             createPopupWindow(scene, {
//                 x: scene.game.config.width / 2,  // 画面の中央X座標
//                 y: scene.game.config.height / 2, // 画面の中央Y座標
//                 width: scene.game.config.height * 2/3 * 1.618,
//                 height: scene.game.config.height * 2/3,
//                 header: 'Error',
//                 message: msg ,
//             });
//         },
//     });
// }