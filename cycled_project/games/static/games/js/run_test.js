let game;
 
// 🔧 グローバルなゲーム設定（ゲームの挙動をここで調整）
let gameOptions = {
    platformStartSpeed: 350,          // プラットフォームの初期スピード（左向き）
    spawnRange: [100, 350],           // 次のプラットフォーム出現までの距離範囲（ランダム）
    platformSizeRange: [50, 250],     // プラットフォームの幅の範囲
    playerGravity: 900,               // プレイヤーにかかる重力
    jumpForce: 400,                   // ジャンプ時に上向きにかける力
    playerStartPosition: 200,         // プレイヤーのx座標（画面左からの距離）
    jumps: 2                          // プレイヤーがジャンプできる回数（2段ジャンプ）
}
 
// 🎮 ゲーム初期化
window.onload = function() {
    const $container = $('#game-container'); // ゲームを描画するHTML要素をjQueryで取得
    const width = $container.width();        // 要素の幅を取得
    const height = $container.height();      // 要素の高さを取得

    // 🧱 Phaserのゲーム設定
    let gameConfig = {
        type: Phaser.AUTO,                   // 自動でWebGLかCanvasを選択
        width: width,                        // 幅
        height: height,                      // 高さ
        scene: [preloadGame, playGame],      // ゲームで使用するシーン（preloadGameとplayGameを指定）
        backgroundColor: 0x444444,           // 背景色
        parent: 'game-container',            // 描画先のHTML ID
        physics: {
            default: "arcade"                // Arcade物理エンジンを使用
        }
    }

    game = new Phaser.Game(gameConfig);      // ゲームインスタンス作成
    window.focus();                          // ウィンドウにフォーカス（キー入力を確実に受けるため）
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
            frameRate: 5,
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

        // クリック（またはタップ）でジャンプ
        this.input.on("pointerdown", this.jump, this);
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
                this.player.anims.play('jump_ex', true);  // 2段ジャンプなどでジャンプexアニメーションを再生
            }
        }
    }

    // 🔁 フレームごとの更新処理
    update() {
        // プレイヤーが画面外に落ちたらゲームリスタート
        if (this.player.y > game.config.height) {
            this.scene.start("PlayGame");
        }

        // プレイヤーのx座標を固定（横スクロール風）
        this.player.x = gameOptions.playerStartPosition;
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
