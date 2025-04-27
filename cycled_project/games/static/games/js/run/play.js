import { gameOptions } from './config.js';
import { createBtn } from './preload.js';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super("PlayScene");
    }

    // 🎲 ゲーム初期化処理
    create() {
        // 背景レイヤーの初期化
        this.backgroundLayers = {};
        this.createBackgroundLayer('sky',-5);
        this.createBackgroundLayer('mountain',-4);
        this.createBackgroundLayer('mountains',-3);
        this.createBackgroundLayer('mountain-trees',-2);
        this.createBackgroundLayer('trees',-1);
            
        // アクティブなプラットフォームを管理するグループ
        this.platformGroup = this.add.group({
            removeCallback: function(platform) {
                platform.scene.platformPool.add(platform); // 削除されたらプールへ
            }
        });
        // 非アクティブな（再利用用）プラットフォームプール
        this.platformPool = this.add.group({
            removeCallback: function(platform) {
                platform.scene.platformGroup.add(platform); // 使用時はアクティブへ戻す
            }
        });

        this.playerJumps = 0; // プレイヤーのジャンプ回数（初期化）

        // 最初のプラットフォームを生成
        this.addPlatform(this.game.config.width, 0);

        this.player = this.physics.add.sprite(
            gameOptions.playerStartPosition, 
            this.game.config.height / 2, 
            'NinjaFrogRun',
            0);
        this.player.setDisplaySize(64, 64);  // プレイヤーのサイズ設定
        this.player.setGravityY(gameOptions.playerGravity); // 重力設定

        // プレイヤーとプラットフォームの衝突設定
        this.physics.add.collider(this.player, this.platformGroup);

        // クリック（またはタップまたはスペース）でジャンプ
        this.input.on("pointerdown", this.jump, this);
        this.input.keyboard.on('keydown-SPACE', this.jump, this); // ←追加！

        this.distanceText = this.add.text(20, 20, 'きょり: 0.0m', {
            fontFamily: 'DotGothic16',
            fontSize: '24px',
            color: '#ffffff',
            resolution: 2  // ← 文字が潰れないように拡大表示（オプション）
        });

        this.elapsedTime = 0;
        this.lastUpdateTime = 0;
        this.lastSpeedChange30 = 0;
        this.distance = 0;
        this.platformSpeed = gameOptions.platformStartSpeed;
        this.isPaused = false;
        this.justPaused = false;
        this.selfPased = false;
        this.score = 0; //スコア初期化

        // 別タブに移動したらポーズ
        this.game.events.on(Phaser.Core.Events.BLUR, this.handleBlur, this);
        this.game.events.on(Phaser.Core.Events.FOCUS, this.handleFocus, this);

        this.pauseButton = this.add.text(this.game.config.width - 80, 40, '⏸', {
            fontSize: '48px',
            fill: '#ffffff'
        }).setInteractive()
        .setScrollFactor(0)
        .on('pointerdown', (pointer) => {
            pointer.event.stopPropagation(); // ← これで他のイベントに伝わらない！
            this.pauseGame(this.resumeBtns);
        });

        // ポーズ時のボタンに関するもの
        this.resumeBtns = [];  
        const option = { centerX: true, fontFamily: '"Press Start 2P"' };
        // ボタンラベルとアクションの配列
        var buttons = [
            { label: 'Continue', callback: () => this.resumeGame() },
            { label: 'Re:start', callback: () => this.rePlayGame() },
            { label: 'Exit', callback: () => this.goStartScreen() }
        ];
        // ボタン作成
        buttons.forEach(({ label, callback }) => {
            const { container, hitArea } = createBtn(0, 0, this, label, option);
            container.setDepth(100);
            hitArea.on('pointerdown', () => {
                if (this.isPaused) callback();
            });
            this.resumeBtns.push({ container, hitArea });
        });
        // 等間隔に並べる
        var baseY = 150;
        var spacing = 180;
        this.resumeBtns.forEach((btn, index) => {
            btn.container.y = baseY + spacing * index;
            btn.container.setVisible(false);
            btn.hitArea.disableInteractive();
        });

        // gameOverに関するもの
        this.gameoverBtns = [];  
        buttons = [
            { label: 'Re:start', callback: () => this.rePlayGame() },
            { label: 'Ranking', callback: () => this.goRankingScene() },
            { label: 'Exit', callback: () => this.goStartScreen() }
        ];
        buttons.forEach(({ label, callback }) => {
            const { container, hitArea } = createBtn(0, 0, this, label, option);
            container.setDepth(100);
            hitArea.on('pointerdown', () => {
                if (this.isPaused) callback();
            });
            this.gameoverBtns.push({ container, hitArea });
        });
        baseY = 300;
        spacing = 150;
        this.gameoverBtns.forEach((btn, index) => {
            btn.container.y = baseY + spacing * index;
            btn.container.setVisible(false);
            btn.hitArea.disableInteractive();
        });
        this.is_gameover = false;

        this.pauseOverlay = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.5
        ).setDepth(99);
        this.pauseOverlay.setVisible(false);    // 非表示

        // 残機の初期値
        this.lives = 1;
        this.isRespawning = false; // ← フラグを追加
        // 右上に表示するテキストの作成
        // 残機数を管理する画像を保持する配列
        this.livesIcons = []; 
        this.updateLivesDisplay();

        // rankingSceneが起動中だったら停止する
        if (this.scene.isActive('RankingScene')) this.scene.stop('RankingScene');
    }

    // 残機の表示を更新する関数
    updateLivesDisplay() {
        // すでに表示されているライフアイコンを削除
        this.livesIcons.forEach(icon => {
            icon.destroy();
        });
        this.livesIcons = []; // 配列をリセット

        // 新たに残機アイコンを表示
        for (let i = 0; i < this.lives; i++) {
            var size = 48;
            let lifeIcon = this.add.sprite(
                (i * size) + size/2 + 10, 64 + 10,  // X座標を調整して並べる
                'NinjaFrogIdle', // 画像のキーを指定
                0
            );
            // スプライトの大きさを指定（幅と高さ）
            lifeIcon.setDisplaySize(size, size); // 幅高さ設定
            // lifeIcon.setTint(0xFF0000); //色設定
            this.livesIcons.push(lifeIcon); // 配列に追加
        }
    }

    // ➕ プラットフォームを追加する関数
    addPlatform(platformWidth, posX) {
        const aspect = 1.5;
        const tileWidth = 16 * aspect;  // タイル1つの幅
        const tileCount = Math.ceil(platformWidth / tileWidth);  // 必要なタイル数
        const posY = this.game.config.height * 0.8;  // プラットフォームのY座標（固定）
    
        // タイルを連結してプラットフォームを作成
        for (let i = 0; i < tileCount; i++) {
            let tile;
    
            // プールからタイルを取得
            if (this.platformPool.getLength()) {
                tile = this.platformPool.getFirst();
                tile.x = posX + i * tileWidth;  // タイルの位置を調整
                tile.active = true;
                tile.visible = true;
                this.platformPool.remove(tile);  // プールから取り出す
            }
            // プールが空なら新しいタイルを生成
            else {
                tile = this.physics.add.sprite(posX + i * tileWidth, posY, "terrain", 3);
                tile.setImmovable(true);  // プレイヤーに押されないように
                tile.setVelocityX(gameOptions.platformStartSpeed * -1);  // 左へ動く
                tile.setScale(aspect);  // タイルを拡大
                this.platformGroup.add(tile);
            }
    
            tile.body.allowGravity = false;  // 重力無視
        }
        // プラットフォームの幅にぴったり合わせるための調整
        const lastTile = this.platformGroup.getChildren()[this.platformGroup.getChildren().length - 1];
        const remainingWidth = platformWidth - (tileCount - 1) * tileWidth;  // 余った幅
        lastTile.x += remainingWidth - tileWidth;  // 最後のタイルの位置を調整して、隙間をなくす
    
        // 次のプラットフォーム出現までの距離をランダムに決定
        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);
    }
    

    // 背景レイヤーの作成関数
    createBackgroundLayer(layerName,depth) {
        this.backgroundLayers[layerName] = [
            this.add.image(0, 0, layerName).setOrigin(0, 0).setDisplaySize(this.game.config.width, this.game.config.height).setDepth(depth),
            this.add.image(this.game.config.width, 0, layerName).setOrigin(0, 0).setDisplaySize(this.game.config.width, this.game.config.height).setDepth(depth)
        ];
    }

    // ジャンプ開始時
    jump() {
        if (this.justPaused || this.isPaused) return;   //ポーズ中及びポーズ後すぐはジャンプ不可
        let jumpForce = gameOptions.jumpForce;

        if (this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps)) {
            if (this.player.body.touching.down) {
                this.playerJumps = 0; // 地面に着地していたらジャンプ回数リセット
            }
            this.player.setVelocityY(jumpForce * -1); // 上方向にジャンプ
            this.playerJumps++; // ジャンプ回数をカウント
            if(this.playerJumps === 1) {
                this.player.anims.play('jump', true);  // 最初のジャンプは通常のジャンプアニメーション
            } else {
                this.player.anims.play(this.anims.get('jump_ex') ? 'jump_ex' : 'jump', true);
            }
        }
    }

    // 🔁 フレームごとの更新処理
    update() {
        if (!this.isPaused) {
            let currentTime = this.time.now;
            // 最初の更新時にだけ 差を０に
            this.lastUpdateTime ||= currentTime;
            let deltaTime = (currentTime - this.lastUpdateTime) / 1000;
            this.elapsedTime += deltaTime;
            this.lastUpdateTime = currentTime;
    
            // 距離を積算して表示（プレイヤー縦幅を1mとして換算）
            let meterPerPixel = 1 / this.player.displayHeight;
            let deltaPixelDistance = deltaTime * this.platformSpeed;
            this.score += deltaPixelDistance * meterPerPixel;
            this.distanceText.setText('きょり: ' + strScore(this.score));
    
            // 30秒おきに加速
            if (this.elapsedTime - this.lastSpeedChange30 >= 30) {
                this.platformSpeed += 60;
                this.lastSpeedChange30 = this.elapsedTime;
            }
    
            // すべてのプラットフォーム速度更新
            this.platformGroup.getChildren().forEach(platform => {
                platform.setVelocityX(this.platformSpeed * -1);
            });
        } else {
            this.lastUpdateTime = this.time.now; // ポーズ中は差分をリセット
        }

        // プレイヤーが画面外に落ちたらゲームリスタート
        if (this.player.y > this.game.config.height && !this.isRespawning) {
            this.loseLife();
        }

        // 地面にいる場合
        if (this.player.body.touching.down) {
            this.player.setVelocityX(this.platformSpeed);  // 横方向に動かす（platformStartSpeedと同じ速度）
        } else {
            this.player.setVelocityX(0);  // 空中にいる間は横方向に動かさない
        }
        // プレイヤーのx位置がgameOptions.playerStartPosition / 2 より小さくなった場合 かつ　地面に接している時
        if ((this.player.x < gameOptions.playerStartPosition / 2 || this.player.x > gameOptions.playerStartPosition* 3 / 2)  && (this.player.body.touching.down)) {
            // 現在のplayerのx座標と目標位置（gameOptions.playerStartPosition）との距離を計算
            let distance = Math.abs(this.player.x - gameOptions.playerStartPosition);
            // 距離に基づいてdurationを決定（例えば、距離1あたり0.5秒）
            let duration = distance * 10;
            // スムーズに加速しながら戻す
            this.tweens.add({
                targets: this.player,
                x: gameOptions.playerStartPosition,    // 戻す目標位置
                duration: duration,                         // 移動にかかる時間（500msでスムーズに戻す）
                ease: 'Power2',                        // 加速から減速のイージング（Power2）
                onComplete: () => {
                    // 元の速さに戻す
                    this.player.setVelocityX(this.platformSpeed); // 戻した後、元の速さに設定
                }
            });
        }

        // プレイヤーが地面に接触しているかどうかを確認
        if (this.player.body.touching.down && !this.isPaused) {
            // 地面にいるときは「run」アニメーション
            this.player.anims.play('run', true);
        }

        // プラットフォームの再利用処理
        let minDistance = this.game.config.width;
        this.platformGroup.getChildren().forEach(function(platform) {
            let platformDistance = this.game.config.width - platform.x - platform.displayWidth / 2;
            minDistance = Math.min(minDistance, platformDistance);

            // 画面外に出たら非表示＆プールへ戻す
            if (platform.x < -platform.displayWidth / 2) {
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        // 一定距離空いたら新しいプラットフォームを追加
        if (minDistance > this.nextPlatformDistance) {
            let nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
            this.addPlatform(nextPlatformWidth, this.game.config.width + nextPlatformWidth / 2);
        }

        // 背景のパララックス効果（スクロールに応じて背景を動かす）
        this.scrollBackground('sky', 0);
        this.scrollBackground('mountain', 0.0005);
        this.scrollBackground('mountains', 0.001);
        this.scrollBackground('mountain-trees', 0.002);
        this.scrollBackground('trees', 0.005);
    }


    // 背景レイヤーのスクロール処理
    scrollBackground(layerName, speed) {
        if (this.isPaused) return; // 一時停止中はスクロールしない

        // 背景をスクロール
        this.backgroundLayers[layerName].forEach(layer => {
            layer.x -= this.platformSpeed * speed;
        });

        // 最初の背景が画面外に出たら再配置
        if (this.backgroundLayers[layerName][0].x <= -this.game.config.width) {
            this.backgroundLayers[layerName][0].x = this.backgroundLayers[layerName][1].x + this.game.config.width;
        }
        if (this.backgroundLayers[layerName][1].x <= -this.game.config.width) {
            this.backgroundLayers[layerName][1].x = this.backgroundLayers[layerName][0].x + this.game.config.width;
        }
    }

    pauseGame(btns) {
        if (!this.scene.isActive('PlayScene')) return;
        if (this.is_gameover) return;
        
        if (this.countdownEvent) {
            this.countdownEvent.remove();        // カウントダウン停止
            this.countdownEvent = null;
        }
        if (this.countdownText) {
            this.countdownText.destroy();        // 表示中の "3", "2", ... "Start!" を消す
            this.countdownText = null;
        }
        // ✅ ここでBtn入力を再有効化
        this.input.enabled = true;
        
        this.isPaused = true;
        this.physics.pause();
        this.selfPased = true;
        this.pauseButton.setText('▶'); // ← 一時停止中は「再生」っぽく表示
        // アニメーションを stop に切り替え(接地していた場合)
        if (this.player.body.touching.down){
            this.player.anims.play('stop');
        }

        // 🔲 1. 背景を少し暗くする（透明な黒）
        this.pauseOverlay.setVisible(true);

        // この最中はポーズ・再生できない
        this.justPaused = true;
        this.time.delayedCall(50, () => {
            this.justPaused = false;
            // ▶ 2. 中央に再開ボタンを表示
            btns.forEach(btn => {
                btn.container.setVisible(true);             // 表示
                btn.hitArea.setInteractive();               // ヒットエリアを有効化
            });
        });
    }
    
    resumeGame() {
        // もし前回のcountdownTextが残っていたら消す
        if (this.countdownText) {
            this.countdownText.destroy();
        }
        // 既存のカウントダウンイベントが存在している場合はリセット
        if (this.countdownEvent) {
            this.countdownEvent.remove();  // 以前のイベントを停止
        }
        
        // 新たにカウントダウンテキストを追加
        this.countdownText = this.add.text(this.game.config.width / 2, this.game.config.height / 2, '', {
            fontFamily: 'DotGothic16',
            fontSize: '64px',
            fill: '#ffffff'
        }).setOrigin(0.5);
    
        this.pauseButton.setText('⏸'); // ← 再開時は「ポーズ」アイコンに戻す
        this.selfPased = false;

        let count = 3;
        // 画面インタラクションを無効化
        this.input.enabled = false;
    
        // 1秒ごとにカウントダウン
        this.countdownEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.countdownText.setText(count);
                count--;
                if (count < 0) {
                    // 0以下になったら「スタート！」表示
                    this.countdownText.setText("Start！");
                    // 1秒後にゲームを再開
                    this.time.delayedCall(1000, () => {
                        this.countdownText.destroy();
                        this.isPaused = false;
                        this.physics.resume();
                        // 画面インタラクションを再有効化
                        this.input.enabled = true;
                    }, null, this);
                    // イベントを停止
                    this.countdownEvent.remove();
                }
            },
            callbackScope: this,
            repeat: 3 // 3回だけ繰り返す
        });

        // 🔄 ポーズ用UIを非表示
        this.pauseOverlay.setVisible(false);
        // まとめてBtn非表示&無効化
        this.resumeBtns.forEach(btn => {
            btn.container.setVisible(false);
            btn.hitArea.disableInteractive();
        });

        this.justPaused = true;
        this.time.delayedCall(50, () => {
            this.justPaused = false;
        });
    }

    // 「Start画面」に戻る処理
    goStartScreen() {
        // イベントリスナーを削除してからシーンを停止
        this.shutdown();
        this.scene.start('StartScene');
        this.scene.stop();  // 現在のシーンを停止
    }

    // ライフが減る処理など
    loseLife() {
        this.isRespawning = true; // フラグを立てる
        this.lives--; // 残機を減らす
        this.updateLivesDisplay(); // 表示を更新

        // タイムまわり総初期化
        this.elapsedTime = 0;
        this.lastUpdateTime = 0;
        this.lastSpeedChange30 = 0;
    
        if (this.lives < 0) {
            this.postScore();
        } else {
            this.respawnPlayer();
        }
    }
    respawnPlayer() {
        // プレイヤーを一時的に非表示・無効化
        this.player.setVisible(false);
        this.player.setActive(false);
        this.player.body.enable = false;
        // 画面インタラクションを無効化
        this.input.enabled = false;

        this.physics.pause();
        this.isPaused = true;
        this.selfPased = true;
        
        // すべての地面を一度消去
        const platforms = this.platformGroup.getChildren().slice().sort((a, b) => a.x - b.x);
        platforms.forEach((platform, index) => {
            this.time.delayedCall(index * 100, () => {
                this.tweens.add({
                    targets: platform,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        this.platformGroup.killAndHide(platform);
                        this.platformGroup.remove(platform);
                        this.platformPool.add(platform);
                        platform.alpha = 1; // 次回使うとき用に戻す
                    }
                });
            });
        });

        // 少し時間をおいてから再出現
        // すべて消えるまで待ってから再構築とプレイヤー復帰
        const totalDelay = Math.max(platforms.length * 100 + 300, 1000);
        this.time.delayedCall(totalDelay, () => {
            this.addPlatform(this.game.config.width, 0);
            this.player.setPosition(
                gameOptions.playerStartPosition, 
                this.game.config.height / 2 
            ); // 初期位置に配置
    
            // 有効化して再表示
            this.player.setVisible(true);
            this.player.setActive(true);
            this.player.body.enable = true;
            this.isRespawning = false; // フラグを戻す
            this.physics.resume();
            this.isPaused = false;
            this.selfPased = false;
            this.input.enabled = true;
        });
    }
    rePlayGame() {
        this.scene.restart();
    }

    GameOver(is_newrecord = false) {
        var stHeight = 100;
        this.gameOverText = this.add.text(
            this.cameras.main.centerX,
            -100,  // 画面の上外からスタート
            'Game Over',
            {
                fontFamily: '"Press Start 2P"',
                fontSize: '64px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(100);
        // 上から落ちるアニメーション
        this.tweens.add({
            targets: this.gameOverText,
            y: stHeight,
            ease: 'Bounce.easeOut',  // バウンド効果
            duration: 700,  // 落ちる時間
            repeat: 0  // 繰り返しなし
        });
        if (is_newrecord) {
            const newRecordText = this.add.text(
                -200,
                stHeight + this.gameOverText.height,
                'NEW RECORD!',
                {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '24px',
                    color: '#FFD700',   // 金色っぽい
                    stroke: '#FF0000',  // 赤い縁取り
                    strokeThickness: 8, // 縁取りの太さ
                    shadow: {
                        offsetX: 4,
                        offsetY: 4,
                        color: '#000000',
                        blur: 4,
                        fill: true
                    }
                }
            ).setOrigin(0.5).setDepth(100);
            // New Record
            this.tweens.add({
                targets: newRecordText,
                x: this.cameras.main.centerX, // 中央までスライド
                ease: 'Power2', // スムーズな加速＆減速
                duration: 700, // 移動
                delay: 1000,    //1秒後に実行
            });
            // 点滅アニメーションを追加
            this.tweens.add({
                targets: newRecordText,
                alpha: { from: 1, to: 0 }, // 透明度を1から0に変更
                yoyo: true,                // アニメーションが終わったら元に戻る
                repeat: -1,                // 永遠に繰り返す
                duration: 500,             // 500msでフェードイン・フェードアウト
                ease: 'Sine.inOut',        // スムーズに点滅
                delay: 2000,
            });
        }

        // スコアを表示するテキスト
        var scoreDisplay = strScore(this.score);
        const scoreText = this.add.text(
            this.cameras.main.centerX,
            -100,  // "Game Over" の下に配置
            scoreDisplay,  // 実際のスコア値を表示
            {
                fontFamily: '"Press Start 2P"',
                fontSize: '32px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(100);
        // スコアのアニメーション
        this.tweens.add({
            targets: scoreText,
            y: stHeight + this.gameOverText.height + 60,   // Game Overのテキスト下に配置
            ease: 'Bounce.easeOut',
            duration: 1000,
            repeat: 0
        });
    
        this.pauseGame(this.gameoverBtns);
        this.is_gameover = true;    // pauseの後にtrueにする
    }
    

    handleBlur() {
        this.pauseGame(this.resumeBtns);
    }

    handleFocus() {
        // 自前でポーズしていなかったら
        if (!this.selfPased) {
            this.resumeGame();
        }
    }

    postScore() {
        var id = score_id;
        var score = this.score;
        var is_newrecord = false;
        $.ajax({
            url: `/games/api/score_nikirun/${id}/`,
            method: 'PATCH',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            data: {
                score: score,  // 更新したいデータ
            },
            success: (response) => {
                is_newrecord = Boolean(response.is_newrecord)
                this.GameOver(is_newrecord);
            },
            error: function(xhr, status, error) {
                var response = xhr.responseJSON;
                var errors = response.form.fields;
                $.each(errors,function(_,error) {
                    // 手動でエラーを出力
                    append_error_ajax(error.label,error.errors);
                })
                this.GameOver(is_newrecord);
            },
        }); 
    }

    goRankingScene() {
        // this.preScene = 'PlayScene';
        this.scene.get('RankingScene').data.set('previousScene', 'PlayScene');

        if (this.scene.isActive('RankingScene')) {
            // すでに起動している場合はbringToTopで最前面に移動
            this.scene.bringToTop('RankingScene');
        } else {
            // 起動していなければ、RankingSceneをオーバーレイとして開始
            this.scene.launch('RankingScene');
        }
        this.gameOverText.setAlpha(0);  //titleを隠す
    }
    preBackScene() {
        this.gameOverText.setAlpha(1);  //titleを見せる
    }

    // シーン終了時にイベントリスナーを削除
    shutdown() {
        if (this.game) {
            this.game.events.removeListener(Phaser.Core.Events.BLUR, this.handleBlur, this);
            this.game.events.removeListener(Phaser.Core.Events.FOCUS, this.handleFocus, this);
        }
    }
};

function strScore(score) {
    let scoreDisplay;
    if (score > 1000000) {
        scoreDisplay = (score / 1000).toFixed(0) + ' km';
    } else if (score > 1000) {
        scoreDisplay = (score / 1000).toPrecision(3) + ' km';
    } else {
        scoreDisplay = score.toPrecision(3) + ' m';
    }
    return scoreDisplay;
}