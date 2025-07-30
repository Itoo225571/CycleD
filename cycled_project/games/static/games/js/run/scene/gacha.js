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
        this.pullButton = this.add.container(
            (this.scale.width - width*16) / 2, 
            this.scale.height * 4/5 - height*16/2,
        );
        // テキストを追加
        this.pullText = this.add.text(
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
        this.pullFrame = createFrame(this,width,height,'msgWindowTile')
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.pullText.setColor('#ffff00');  // 色コードで直接指定
                this.pullFrame.setTint(0x888888);
            })
            .on('pointerout', ()=>{
                this.pullText.setColor('#000000');  // 元の色に戻す
                this.pullFrame.clearTint();  // 色を元に戻す
            })
            .on('pointerdown', ()=>{
                this.slotGacha();
            });
        this.pullButton.add(this.pullFrame);  // コンテナに追加
        this.pullButton.add(this.pullText);  // コンテナに追加

        // スロット
        var size = 20;
        this.slotArea = this.add.container(
            (this.scale.width - size * 16) / 2, 
            this.scale.height * 1/2 - 60 - size* 16/2,
        );
        this.slotFrame = createFrame(this,size,size,'frameGacha')
        this.slotArea.add(this.slotFrame);  // コンテナに追加

        this.slotSymbols = [];
        const symbolNames = ['SpikeBall','SpikeBall','SpikeBall','SpikeBall',];  // アセットキー例
        const symbolSize = 64;  // スプライトの高さ
        const symbolCount = symbolNames.length;
        
        // slotAreaはすでに作っている想定
        for (let i = 0; i < symbolCount; i++) {
            const symbol = this.add.sprite(0, i * symbolSize, symbolNames[i]).setOrigin(0.5, 0);
            this.slotArea.add(symbol);
            this.slotSymbols.push(symbol);
        }
        this.isSpinning = false;

    }
    // 「Start画面」に戻る処理
    goStartScreen() {
        // bgm停止
        this.bgmManager.stop();
        this.scene.start('StartScene');
        this.scene.stop();  // 現在のシーンを停止
    }

    // スロット
    slotGacha(){
        if (this.isSpinning) return;  // 回転中は無視

        this.isSpinning = true;
        this.sfxManager.play('buttonSoftSound');

        const totalSpinDuration = 3000;  // 3秒間回す
        const spinIntervalMs = 100;      // 100msごとに切り替え
        let elapsed = 0;
        let currentIndex = 0;

        // 回転タイマー
        this.spinTimer = this.time.addEvent({
            delay: spinIntervalMs,
            callback: () => {
                // 全絵柄を非表示に
                this.slotSymbols.forEach(s => s.setVisible(false));

                // 1つだけ表示
                this.slotSymbols[currentIndex].setVisible(true);

                currentIndex = (currentIndex + 1) % this.slotSymbols.length;

                elapsed += spinIntervalMs;
                if (elapsed >= totalSpinDuration) {
                    this.spinTimer.remove(false);
                    this.isSpinning = false;

                    // 停止時の絵柄を表示（currentIndex - 1）
                    const finalIndex = (currentIndex + this.slotSymbols.length - 1) % this.slotSymbols.length;
                    this.slotSymbols.forEach(s => s.setVisible(false));
                    this.slotSymbols[finalIndex].setVisible(true);

                    // ここに結果表示や処理を追加
                }
            },
            loop: true,
        });
    }
}