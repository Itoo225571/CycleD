import { gameOptions } from './config.js';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super("PlayScene");
    }

    // 🎲 ゲーム初期化処理
    create() {
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
        this.addPlatform(this.game.config.width, this.game.config.width / 2);

        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, this.game.config.height / 2, 'player');
        this.player.setScale(3); // 2倍サイズに拡大
        this.player.setGravityY(gameOptions.playerGravity); // 重力設定

        // プレイヤーとプラットフォームの衝突設定
        this.physics.add.collider(this.player, this.platformGroup);

        // クリック（またはタップまたはスペース）でジャンプ
        this.input.on("pointerdown", this.jump, this);
        this.input.keyboard.on('keydown-SPACE', this.jump, this); // ←追加！

        this.elapsedText = this.add.text(10, 10, 'Time: 0.0', {
            font: '24px Arial', 
            fill: '#ffffff'
        });
        this.distanceText = this.add.text(20, 60, 'Distance: 0.0m', { fontSize: '30px', fill: '#fff' }); // 距離

        this.elapsedTime = 0;
        this.lastUpdateTime = this.time.now;
        this.lastSpeedChange30 = 0;
        this.distance = 0;
        this.platformSpeed = gameOptions.platformStartSpeed;
        this.isPaused = false;
        this.justPaused = false;
        this.selfPased = false;

        // 別タブに移動したらポーズ
        this.game.events.on(Phaser.Core.Events.BLUR, () => {
            this.pauseGame();
        });
        this.game.events.on(Phaser.Core.Events.FOCUS, () => {
            // 自前でポーズしていなかったら
            if (!this.selfPased) {
                this.resumeGame();
            }
        });
        this.pauseButton = this.add.text(this.game.config.width - 80, 30, '⏸', {
            fontSize: '32px',
            fill: '#ffffff'
        }).setInteractive()
        .setScrollFactor(0)
        .on('pointerdown', (pointer) => {
            pointer.event.stopPropagation(); // ← これで他のイベントに伝わらない！
            this.pauseGame();
        });        
    }

    // ➕ プラットフォームを追加する関数
    addPlatform(platformWidth, posX) {
        let platform;

        // プールから使いまわす
        if (this.platformPool.getLength()) {
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
        }
        // プールが空なら新しく生成
        else {
            platform = this.physics.add.sprite(posX, this.game.config.height * 0.8, "platform");
            platform.setImmovable(true);
            platform.setVelocityX(gameOptions.platformStartSpeed * -1); // 左へ動かす
            this.platformGroup.add(platform);
        }

        // プラットフォームの幅を設定
        platform.displayWidth = platformWidth;
        // platform.displayHeight = 200; // ここで高さを変更

        // 次のプラットフォーム出現までの距離をランダムに決定
        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);
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
    
            // 経過時間を表示
            this.elapsedText.setText('Time: ' + this.elapsedTime.toFixed(1));
    
            // 距離を積算して表示（プレイヤー縦幅を1mとして換算）
            let meterPerPixel = 1 / this.player.displayHeight;
            let pixelDistance = this.elapsedTime * this.platformSpeed;
            let distanceMeters = pixelDistance * meterPerPixel;
            this.distanceText.setText('きょり: ' + distanceMeters.toFixed(1) + 'm');
    
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
        if (this.player.y > this.game.config.height) {
            this.scene.start("PlayScene");
        }

        // プレイヤーのx座標を固定（横スクロール風）
        // this.player.x = gameOptions.playerStartPosition;
        // 地面にいる場合
        if (this.player.body.touching.down) {
            this.player.setVelocityX(this.platformSpeed);  // 横方向に動かす（platformStartSpeedと同じ速度）
        } else {
            this.player.setVelocityX(0);  // 空中にいる間は横方向に動かさない
        }
        // プレイヤーのx位置がgameOptions.playerStartPosition / 2 より小さくなった場合 かつ　地面に接している時
        if (this.player.x < gameOptions.playerStartPosition / 2 && this.player.body.touching.down) {
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
    }
    pauseGame() {
        this.isPaused = true;
        this.physics.pause();
        this.selfPased = true;
        this.pauseButton.setText('▶'); // ← 一時停止中は「再生」っぽく表示
        // アニメーションを stop に切り替え(接地していた場合)
        if (this.player.body.touching.down){
            this.player.anims.play('stop');
        }

        // この最中はポーズ・再生できない
        this.justPaused = true;
        this.time.delayedCall(50, () => {
            this.justPaused = false;
            this.input.on("pointerdown", () => {
                if (this.isPaused) {   // ゲームがポーズ中の場合のみ
                    this.resumeGame();
                }
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
        // 再描画を強制するために、一時的にカメラをリセット
        this.cameras.main.fadeOut(0); // フェードアウト
        this.cameras.main.fadeIn(200); // フェードインして再描画

        this.justPaused = true;
        this.time.delayedCall(50, () => {
            this.justPaused = false;
        });
    }    
};
