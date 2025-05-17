import { createMsgWindow,createPopupWindow } from './drawWindow.js';

export default class SelectCharacterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SelectCharacterScene' });
    }

    create() {
        this.charaData = this.registry.get('playersData');

        this.userInfo = this.registry.get('userInfo');
        this.characterConfigs = {};
        // `this.charaData` をループし、`null` でないキャラクターのみ処理
        for (const key in this.charaData) {
            const chara = this.charaData[key];
            this.characterConfigs[key] = { ...chara };
        }

        this.characterKeys = Object.keys(this.characterConfigs);

        this.centerX = this.cameras.main.width / 2;
        this.centerY = this.cameras.main.height / 2;
        this.selectedIndex = 0;

        this.lastUpdateTime = 0;

        this.animsDuration = 200;

        // キャラステータス
        this.statusGraphics = this.add.graphics();
        this.statusHexLength = 200;
        this.currentValues = [0, 0, 0];
        this.statusNote = this.add.text(
            this.game.config.width - this.statusHexLength, this.statusHexLength * 2 +20 , '', {
            fontFamily: 'JF-Dot-K14',
            fontSize: '32px',       // フォントサイズ
            color: '#ffffff',       // 文字色（白）
            lineSpacing: 10,        // ← この値を大きくすると行間が広がる
            fontWeight: 'bold',     // これで全体が太字になる
        }).setOrigin(0.5).setDepth(2);
        this.drawStatusGraph(this.game.config.width - this.statusHexLength, this.statusHexLength, this.statusHexLength, this.currentValues);  // 初回描画

        // キャラ画像生成
        this.updateCharacterSprites();
        this.updateCarousel(this.selectedIndex, false);

        // キーボードでも選択可
        this.input.keyboard.on('keydown-LEFT', () => {
            this.updateCarousel((this.selectedIndex - 1 + this.characterKeys.length) % this.characterKeys.length);
        });

        this.input.keyboard.on('keydown-RIGHT', () => {
            this.updateCarousel((this.selectedIndex + 1) % this.characterKeys.length);
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            // console.log("Selected character:", this.characterKeys[this.selectedIndex]);
            this.selectCharacter(this.selectedIndex);
        });

        // 戻るボタン
        this.backButton = this.add.sprite(100, 80, 'inputPrompts', 608);  // (x, y, key, frame)
        // ボタンにインタラクションを追加（クリックイベント）
        this.backButton.setDisplaySize(48 *3/2, 48);
        this.backButton.setInteractive({ useHandCursor: true });
        this.backButton.setFlipX(true);  // 水平方向に反転
        this.backButton.on('pointerdown', this.goStart.bind(this));
        // ホバー時の色変更（マウスオーバー）
        this.backButton.on('pointerover', () => {
            this.backButton.setTint(0x44ff44);  // ホバー時に緑色に変更
        });
        // ホバーを外した時の色を戻す（マウスアウト）
        this.backButton.on('pointerout', () => {
            this.backButton.clearTint();  // 色を元に戻す
        });
    }

    updateCarousel(newIndex, withAnimation = true) {
        const currentTime = Date.now();  // 現在の時刻を取得
        // animsDuration以上経過していない場合は実行しない(ちょっと余裕を持たせる)
        if (currentTime - this.lastUpdateTime < this.animsDuration + 100) {
            return;
        }
        this.lastUpdateTime = currentTime; // 更新時刻を記録

        this.selectedIndex = newIndex; // selectedIndex をここで更新

        const total = this.characterSprites.length;
    
        for (let i = 0; i < total; i++) {
            const sprite = this.characterSprites[i];
            const key = this.characterKeys[i];
    
            // 左（-1）、中央（0）、右（+1）のオフセット計算
            let relativeIndex = (i - this.selectedIndex + total) % total;
            if (relativeIndex > total / 2) relativeIndex -= total;
    
            // 表示パラメータ
            const isCenter = relativeIndex === 0;
            const isVisibleRange = Math.abs(relativeIndex) <= 1;
    
            const targetSize = isCenter ? 256 : 128;
            const targetDepth = isCenter ? 1.0 : 0.7;
            const targetX = isVisibleRange ? this.centerX + relativeIndex * 300 : this.centerX;
            const targetY = this.centerY;
            
            const isOwned = this.userInfo.owned_characters.includes(key);
            const finalAlpha = isCenter ? 1.0
                                : (isVisibleRange
                                    ? (isOwned ? 0.7 : 1.0)  // 所有していれば少し薄く、未所持なら濃い
                                    : 0);                    // 範囲外は完全に透明        
    
            sprite.setDepth(targetDepth);
    
            if (withAnimation) {
                this.tweens.add({
                    targets: sprite,
                    x: targetX,
                    y: targetY,
                    displayWidth: targetSize,
                    displayHeight: targetSize,
                    alpha: finalAlpha,  // ← 修正された alpha 値
                    duration: this.animsDuration,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        if (!isVisibleRange) {
                            sprite.setVisible(false); // アニメ後に非表示
                        }
                    }
                });
            } else {
                sprite.x = targetX;
                sprite.y = targetY;
                sprite.setDisplaySize(targetSize, targetSize);
                sprite.setAlpha(finalAlpha);  // ← 同じく修正
                sprite.setVisible(isVisibleRange);
            }
    
            if (isVisibleRange) {
                sprite.setVisible(true);
                // 再生可能な場合
                if (sprite.anims) {
                    sprite.play(key + 'Idle');
                }
                if (isCenter) {
                    const charaInfo = this.characterConfigs[key];
                    var newValues = [
                        charaInfo.speed || null,
                        charaInfo.accel || null,
                        charaInfo.jumpForce || null,
                        // charaInfo.jumps || null,
                        // charaInfo.lives || null,
                    ];
                    const isOwned = this.userInfo.owned_characters.includes(key);
                    this.updateStatusGraph(newValues,isOwned);
                    this.statusNote.setText(`残機: ${charaInfo.lives}\nジャンプ回数: ${charaInfo.jumps+1}`).setVisible(isOwned);


                    var charaMsg = charaInfo.msg || '???';
                    var skillName = charaInfo.skillName || '???';
                    var skillDescription = charaInfo.skillDescription || '?????';
                    const msg = `NAME: ${formatKey(key)}\n${charaMsg}\n[color=#ffff00]SKILL: ${skillName}\n${skillDescription}[/color]`;
                    var option = {
                        // transparent: true,
                    };
                    createMsgWindow(this,msg,10,option);
                }
            }
        }
        function formatKey(key) {
            // 大文字の前にスペースを挿入する関数
            return key.replace(/([a-z])([A-Z])/g, '$1 $2');
        }
    }

    selectCharacter(charaIndex) {
        const key = this.characterKeys[charaIndex];
        const selectedChara = this.charaData[key];
        const isOwned = this.userInfo.owned_characters.includes(key);

        if (isOwned) {
            // ちゃんとステータスがあるキャラか
            const requiredKeys = ['speed', 'accel', 'jumpForce'];
            const isMissing = requiredKeys.some(key => selectedChara[key] === undefined);
            if (isMissing) {
                const popup = createPopupWindow(scene, {
                    x: scene.game.config.width / 2,  // 画面の中央X座標
                    y: scene.game.config.height / 2, // 画面の中央Y座標
                    width: scene.game.config.height * 2/3 * 1.618,
                    height: scene.game.config.height * 2/3,
                    header: 'Error',
                    message: '選択したキャラが存在しません' ,
                });
                return;
            }

            this.registry.set('selectedCharacter', selectedChara);
            const selectedSprite = this.characterSprites[charaIndex];
            selectedSprite.anims.stop();

            // ランダムにモーションを選ぶ
            const animations = ['Run', 'Jump', 'Jump_ex'];
            const randomAnimation = animations[Phaser.Math.Between(0, animations.length - 1)];
            const timeScales = [1,1.2,0.8];
            const randomTimeScale = timeScales[Phaser.Math.Between(0, timeScales.length - 1)];

            selectedSprite.play(key + randomAnimation);
            selectedSprite.anims.timeScale = randomTimeScale;

            // 登場アニメーション（スプライト）
            const appearingEffect = this.add.sprite(selectedSprite.x, selectedSprite.y - 50, 'SelectEffect')
                .setScale(6)
                .setDepth(selectedSprite.depth - 1)
                .play('SelectAnim');

            appearingEffect.on('animationcomplete', () => {
                appearingEffect.destroy();
            });

        
            // 少し上がって戻るアニメーションを追加
            this.tweens.add({
                targets: selectedSprite,
                y: selectedSprite.y - 100, // 上に100px移動
                duration: 500, // アニメーションの時間
                yoyo: true, // 上がった後に戻る
                repeat: 0, // 繰り返しなし
                ease: 'Quad.easeOut', // イージングを使ってスムーズに
                onComplete: () => {
                    // tweenが完了したらアニメーションを停止
                    selectedSprite.play(key + 'Idle');
                    selectedSprite.anims.timeScale = 1; // 戻す
                    this.inputEnabled = false;
                    // start画面に戻る
                    this.time.delayedCall(100, () => {
                        this.goStart();
                        this.inputEnabled = true;
                    });
                }
            });
        } else {
            const popup = createPopupWindow(this, {
                x: this.game.config.width / 2,  // 画面の中央X座標
                y: this.game.config.height / 2, // 画面の中央Y座標
                width: this.game.config.height * 2/3 * 1.618,
                height: this.game.config.height * 2/3,
                header: '購入しますか？',
                message: `このキャラをアンロックするには金コインが [color=#ffd700]${selectedChara.price}コ[/color] 必要です`,
                showCancel: true,
                onOK: () => this.purchaseProcessing(selectedChara),  // 購入処理
                // onCancel: () => console.log('キャンセル押された')
            });
            
        }
    }

    goStart() {
        this.scene.start('StartScene');
    }

    updateCharacterSprites() {
        // キャラ画像生成
        this.characterSprites = [];
        for (let i = 0; i < this.characterKeys.length; i++) {
            let sprite;
            const key = this.characterKeys[i];
            const isOwned = this.userInfo.owned_characters.includes(key);
            if (isOwned) {
                sprite = this.add.sprite(0, 0, key + 'Idle').setInteractive({ useHandCursor: true });
            } else {
                const baseSprite = this.add.sprite(0, 0, key + 'Idle');
                baseSprite.setAlpha(0.2); // キャラを薄くする

                const lockIcon = this.add.image(0, 0, 'lock');
                lockIcon.setOrigin(0.4,0.4);
                lockIcon.setDepth(1); // コンテナ内で前面に出るように
                lockIcon.setAlpha(1.0); // 鍵アイコンを濃く
            
                // キャラとロックアイコンをまとめたコンテナを作成
                sprite = this.add.container(0, 0, [baseSprite, lockIcon]);
                sprite.setSize(baseSprite.width, baseSprite.height);
                sprite.setInteractive({
                    useHandCursor: true,
                    hitArea: new Phaser.Geom.Rectangle(0, 0, baseSprite.width, baseSprite.height),
                    hitAreaCallback: Phaser.Geom.Rectangle.Contains
                });
            }

            sprite.on('pointerdown', () => {
                // タップしたキャラが中央かどうかをチェック
                const tappedIndex = i;
                if (tappedIndex === this.selectedIndex) {
                    // console.log("Selected character:", this.characterKeys[tappedIndex]);
                    // ここで選択したキャラクターの処理を行う
                    this.selectCharacter(tappedIndex);
                } else {
                    this.updateCarousel(tappedIndex); // 新しいキャラクターを選択
                }
            });

            this.characterSprites.push(sprite);
        }
    }

    drawStatusGraph(x, y, length, values) {
        const g = this.statusGraphics;
        const radius = length / 2;
        g.clear();

        // 中心に「？」を作成
        if (!this.graphQ) {
            this.graphQ = this.add.text(x + 5, y + 5, '?', {
                fontFamily: 'DTM-Sans',
                fontSize: '96px',
                color: '#ffffff',
            }).setOrigin(0.5).setDepth(2);
        }

        // === 外側の太円 ===
        g.lineStyle(3, 0xffffff, 1);
        g.strokeCircle(x, y, radius);
        
        if (values === null) {
            this.graphQ.setVisible(true);
            return;  // 以降の描画はスキップ
        }
        this.graphQ.setVisible(false);  // valuesがnull以外の場合は非表示にする

        const minValues = [4, 0, 15,];   // 最小値 - ちょっと(最小値にすると見ずらい)
        const maxValues = [10, 3, 30,];  // 最大値の配列
        const labels = ['Speed', 'Accel', 'Jump',];  // ラベル名（改行あり）
        const relativeValues = values.map((v, i) =>
            Phaser.Math.Clamp((v - minValues[i]) / (maxValues[i] - minValues[i]), 0, 1)
        );
    
        // === 補助円 ===
        g.lineStyle(1, 0xaaaaaa, 0.3);
        for (let i = 0.2; i < 1.0; i += 0.2) {
            g.strokeCircle(x, y, radius * i);
        }
    
        // === 多角形の描画 ===
        const angleStep = Phaser.Math.PI2 / relativeValues.length;
        g.lineStyle(1.5, 0xffffff, 1);
        g.fillStyle(0x00aaff, 0.3);
        g.beginPath();
    
        for (let i = 0; i < relativeValues.length; i++) {
            const value = relativeValues[i];
            const angle = angleStep * i - Phaser.Math.PI2 / 4;
            const px = x + Math.cos(angle) * radius * value;
            const py = y + Math.sin(angle) * radius * value;
    
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        g.strokePath();

        // === 中心から外円までの線 + ラベル ===
        g.lineStyle(1, 0xffffff, 0.5);
        for (let i = 0; i < relativeValues.length; i++) {
            const angle = angleStep * i - Phaser.Math.PI2 / 4;
            const outerX = x + Math.cos(angle) * radius;
            const outerY = y + Math.sin(angle) * radius;

            const labelX = x + Math.cos(angle) * (radius + 50);
            const labelY = y + Math.sin(angle) * (radius + 50);
    
            this.add.text(labelX, labelY, labels[i], {
                fontFamily: 'DTM-Sans',
                fontSize: '36px',
                color: '#ffffff',
            }).setOrigin(0.5).setDepth(2);
        
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(outerX, outerY);
            g.strokePath();
        }
    }
    updateStatusGraph(newValuesArray) {
        // Lockの場合
        const allNull = newValuesArray.every(value => value === null);
        if (allNull) {
            this.drawStatusGraph(
                this.game.config.width - this.statusHexLength,
                this.statusHexLength,
                this.statusHexLength,
                null
            );
            this.currentValues = [0, 0, 0,];
            return;
        }

        const startValues = this.currentValues?.slice?.() ?? [0, 0, 0,];
        const tempValues = this.currentValues?.slice?.() ?? [0, 0, 0,];
        const duration = this.animsDuration;
    
        this.tweens.addCounter({
            from: 0,
            to: 1,
            duration,
            ease: 'Cubic.easeInOut',
            onUpdate: tween => {
                const t = tween.getValue();
    
                for (let i = 0; i < newValuesArray.length; i++) {
                    const start = startValues[i] ?? 0;
                    const end = newValuesArray[i];
                    tempValues[i] = Phaser.Math.Linear(start, end, t);
                }
    
                this.drawStatusGraph(
                    this.game.config.width - this.statusHexLength,
                    this.statusHexLength,
                    this.statusHexLength,
                    tempValues
                );
            },
            onComplete: () => {
                this.currentValues = newValuesArray.slice();  // 終了時に値を更新
            }
        });
    }

    purchaseProcessing(selectedChara) {
        var coin = this.userInfo.user.coin;
        if (coin.num < selectedChara.price) {
            const popup = createPopupWindow(this, {
                x: this.game.config.width / 2,  // 画面の中央X座標
                y: this.game.config.height / 2, // 画面の中央Y座標
                width: this.game.config.height * 2/3 * 1.618,
                height: this.game.config.height * 2/3,
                header: 'お金が足りないヨ！',
                message: `ちゃりニキで日記を書いてコインを貯めよう！`,
            });
            return;
        }
        var owned_characters = this.userInfo.owned_characters;
        if (owned_characters.includes(selectedChara.key)) {
            const popup = createPopupWindow(this, {
                x: this.game.config.width / 2,  // 画面の中央X座標
                y: this.game.config.height / 2, // 画面の中央Y座標
                width: this.game.config.height * 2/3 * 1.618,
                height: this.game.config.height * 2/3,
                header: 'Error',
                message: `すでに所有しているキャラです`,
            });
            return;
        }
        

        const scene = this;  // PhaserのScene内で this を保持しておく
        $.ajax({
            url: '/games/run/buy_chara/',
            type: 'POST',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            contentType: 'application/json',  // これが重要！
            data: JSON.stringify({
                character: selectedChara  // オブジェクト全体を JSON として送る
            }),
            success: function(data) {
                // データを更新
                const popup = createPopupWindow(scene, {
                    x: scene.game.config.width / 2,  // 画面の中央X座標
                    y: scene.game.config.height / 2, // 画面の中央Y座標
                    width: scene.game.config.height * 2/3 * 1.618,
                    height: scene.game.config.height * 2/3,
                    header: data.message,
                    message: `早速${data.character.key}を使用しますか？`,
                    showCancel: true,
                    cancelText: 'NO',
                    onOK: () => {
                        scene.registry.set('selectedCharacter', data.character);
                        scene.registry.set('playersData', data.players);
                        scene.registry.set('userInfo', data.user_info);
                        scene.goStart();
                    },   // キャラを切り替える
                    onCancel: () => {
                        scene.registry.set('playersData', data.players);
                        scene.registry.set('userInfo', data.user_info);
                        scene.scene.restart();
                    }
                });
                scene.add.existing(popup.container);
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
                    case 409:
                        msg = response.detail || 'このキャラクターはすでに購入済みです。';
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
            }
        });     
    }
        
}
