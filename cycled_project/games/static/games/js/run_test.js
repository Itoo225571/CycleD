let game;
 
// 🔧 グローバルなゲーム設定（ゲームの挙動をここで調整）
let gameOptions = {
    platformStartSpeed: 350,          // プラットフォームの初期スピード（左向き）
    spawnRange: [100, 350],           // 次のプラットフォーム出現までの距離範囲（ランダム）
    platformSizeRange: [50, 250],     // プラットフォームの幅の範囲
    playerGravity: 2400,               // プレイヤーにかかる重力
    jumpForce: 1000,                   // ジャンプ時に上向きにかける力
    playerStartPosition: 200,         // プレイヤーのx座標（画面左からの距離）
    jumps: 2                          // プレイヤーがジャンプできる回数（2段ジャンプ）
}
 
// 🎮 ゲーム初期化
window.onload = function() {
    // 🧱 Phaserのゲーム設定
    let gameConfig = {
        type: Phaser.AUTO,                   // 自動でWebGLかCanvasを選択
        width: 1334,
        height: 750,
        scene: [preloadGame, playGame],      // ゲームで使用するシーン（preloadGameとplayGameを指定）
        backgroundColor: 0x444444,           // 背景色
        parent: 'game-container',            // 描画先のHTML ID
        physics: {
            default: "arcade",
            arcade: {
                debug: true    // ← これ追加
            }
        }
    }

    game = new Phaser.Game(gameConfig);      // ゲームインスタンス作成
    window.focus();                          // ウィンドウにフォーカス（キー入力を確実に受けるため）
    // リサイズ監視
    checkGameSize(game);
}

// 🎮 preloadGame シーンの定義
class preloadGame extends Phaser.Scene {
    constructor() {
        super("PreloadGame");
    }

    // 🔄 アセットの読み込み
    preload() {
        this.load.image("platform", imgDir_test + "platform.png"); // プラットフォーム画像
        this.load.spritesheet("player", imgDir_test + "player.png", { frameWidth: 24, frameHeight: 48 }); // プレイヤーのアニメーション用スプライトシート
    }

    // 🎮 プレイシーンに遷移
    create() {
        // プレイヤーキャラを生成
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
            frameRate: 5,
            repeat: -1
        });
        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 0 }),
            frameRate: 1,
            repeat: -1
        });
        this.anims.create({
            key: 'jump_ex',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
            frameRate: 15,
            repeat: -1
        });

        this.scene.start("PlayGame");
    }
}

// 🎮 playGame シーンの定義
class playGame extends Phaser.Scene {
    constructor() {
        super("PlayGame");
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
        this.addPlatform(game.config.width, game.config.width / 2);

        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height / 2, 'player');
        this.player.setGravityY(gameOptions.playerGravity); // 重力設定

        // プレイヤーとプラットフォームの衝突設定
        this.physics.add.collider(this.player, this.platformGroup);

        // クリック（またはタップまたはスペース）でジャンプ
        this.input.on("pointerdown", this.jump, this);
        this.input.keyboard.on('keydown-SPACE', this.jump, this); // ←追加！

        this.startTime = this.time.now; // ゲーム開始時刻
        this.elapsedText = this.add.text(10, 10, 'Time: 0.0', {
            font: '24px Arial', 
            fill: '#ffffff'
        });
        this.lastSpeedChange30 = 0; // 30秒ごとの加速タイミング
        this.platformSpeed = gameOptions.platformStartSpeed;    // 速度

        this.distanceText = this.add.text(20, 60, 'Distance: 0.0m', { fontSize: '30px', fill: '#fff' }); // 距離
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
            platform = this.physics.add.sprite(posX, game.config.height * 0.8, "platform");
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

    // ⬆ ジャンプ処理
    jump() {
        if (this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps)) {
            if (this.player.body.touching.down) {
                this.playerJumps = 0; // 地面に着地していたらジャンプ回数リセット
            }
            this.player.setVelocityY(gameOptions.jumpForce * -1); // 上方向にジャンプ
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
        // 経過時間を計算
        let elapsedTime = (this.time.now - this.startTime) / 1000; // 秒単位に変換
        // 小数点1桁まで表示する
        this.elapsedText.setText('Time: ' + elapsedTime.toFixed(1));
        // 30秒おきに加速
        if (elapsedTime - this.lastSpeedChange30 >= 30) {
            this.platformSpeed += 60; // 30秒後にスピードを増加
            this.lastSpeedChange30 = elapsedTime; // 最後にスピード変更した時間を記録
        }
        // ⬇ 既存プラットフォームの速度も更新
        this.platformGroup.getChildren().forEach(platform => {
            platform.setVelocityX(this.platformSpeed * -1);
        });
        // 移動距離計算・表示
        let speed = gameOptions.platformStartSpeed;
        let meterPerPixel = 1 / this.player.displayHeight;
        let pixelDistance = elapsedTime * speed;
        let distanceMeters = pixelDistance * meterPerPixel;
        this.distanceText.setText('きょり: ' + distanceMeters.toFixed(1) + 'm');  

        // プレイヤーが画面外に落ちたらゲームリスタート
        if (this.player.y > game.config.height) {
            this.scene.start("PlayGame");
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
        if (this.player.body.touching.down) {
            // 地面にいるときは「run」アニメーション
            this.player.anims.play('run', true);
        }

        // プラットフォームの再利用処理
        let minDistance = game.config.width;
        this.platformGroup.getChildren().forEach(function(platform) {
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
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
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2);
        }
    }
};
