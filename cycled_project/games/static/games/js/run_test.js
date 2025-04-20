// ゲームインスタンス
let game;

// ゲームオプション
// global game options
let gameOptions = {

    // プラットフォームの速度範囲
    // platform speed range, in pixels per second
    platformSpeedRange: [300, 300],

    // 山の速度
    // mountain speed, in pixels per second
    mountainSpeed: 80,

    // プラットフォーム間距離の範囲(プラットフォームの右端と画面の右端の距離)
    // spawn range, how far should be the rightmost platform from the right edge
    // before next platform spawns, in pixels
    spawnRange: [80, 300],

    // プラットフォームの横幅範囲
    // platform width range, in pixels
    platformSizeRange: [90, 300],

    // プラットフォームの高さ位置範囲
    // a height range between rightmost platform and next platform to be spawned
    platformHeightRange: [-5, 5],

    // プラットフォーム高さ位置単位
    // a scale to be multiplied by platformHeightRange
    platformHeighScale: 20,

    // プラットフォームの位置範囲
    // platform max and min height, as screen height ratio
    platformVerticalLimit: [0.4, 0.8],

    // 重力
    // player gravity
    playerGravity: 900,

    // ジャンプ力
    // player jump force
    jumpForce: 400,

    // プレイヤーの位置
    // player starting X position
    playerStartPosition: 200,

    // 連続ジャンプ可能数
    // consecutive jumps allowed
    jumps: 2,

    // コインの出現率
    // % of probability a coin appears on the platform
    coinPercent: 25,

    // 炎の出現率
    // % of probability a fire appears on the platform
    firePercent: 25
}

// ロード時の処理
window.onload = function() {
    const $container = $('#game-container');
    const width = $container.width();
    const height = $container.height();

    // ゲーム設定
    // object containing configuration options
    let gameConfig = {
        type: Phaser.AUTO, // 表示方法
        width: width, // 幅
        height: height, // 高さ
        scene: [preloadGame, playGame], // シーン
        backgroundColor: 0x0c88c7, // 背景色
        parent: 'game-container',

        // 物理設定
        // physics settings
        physics: {
            default: "arcade" // 標準
        }
    }

    // ゲームインスタンス生成
    game = new Phaser.Game(gameConfig);

    // ウィンドウにフォーカス
    window.focus();

    checkGame(game);
}

// 画像のロード用シーン
// preloadGame scene
class preloadGame extends Phaser.Scene{
    // コンストラクタ
    constructor(){
        super("PreloadGame");
    }

    // ロード
    preload(){
        // プラットフォーム画像
        this.load.image("platform", imgDir_test + "platform.png");

        // プレイヤースプレッドシート
        // player is a sprite sheet made by 24x48 pixels
        this.load.spritesheet("player", imgDir_test + "player.png", {
            frameWidth: 24,
            frameHeight: 48
        });

        // コインスプレッドシート
        // the coin is a sprite sheet made by 20x20 pixels
        this.load.spritesheet("coin", imgDir_test + "coin.png", {
            frameWidth: 20,
            frameHeight: 20
        });

        // 炎スプレッドシート
        // the firecamp is a sprite sheet made by 32x58 pixels
        this.load.spritesheet("fire",  imgDir_test + "fire.png", {
            frameWidth: 40,
            frameHeight: 70
        });

        // 山スプレッドシート
        // mountains are a sprite sheet made by 512x512 pixels
        this.load.spritesheet("mountain",  imgDir_test + "mountain.png", {
            frameWidth: 512,
            frameHeight: 512
        });
    }

    // 初期化
    create(){

        // プレイヤーが走る
        // setting player animation
        this.anims.create({
            key: "run",
            frames: this.anims.generateFrameNumbers("player", {
                start: 0,
                end: 1
            }),
            frameRate: 8,
            repeat: -1
        });

        // コインが回転する
        // setting coin animation
        this.anims.create({
            key: "rotate",
            frames: this.anims.generateFrameNumbers("coin", {
                start: 0,
                end: 5
            }),
            frameRate: 15,
            yoyo: true,
            repeat: -1
        });

        // 炎が燃える
        // setting fire animation
        this.anims.create({
            key: "burn",
            frames: this.anims.generateFrameNumbers("fire", {
                start: 0,
                end: 3
            }),
            frameRate: 15,
            repeat: -1
        });

        // メインのシーンへ
        this.scene.start("PlayGame");
    }
}

// ゲームのメインシーン
// playGame scene
class playGame extends Phaser.Scene{
    // コンストラクタ
    constructor(){
        super("PlayGame");
    }

    // 初期化
    create(){

        // 山グループ
        // group with all active mountains.
        this.mountainGroup = this.add.group();

        // プラットフォームグループ
        // group with all active platforms.
        this.platformGroup = this.add.group({

            // 削除したらリサイクル用プールへ
            // once a platform is removed, it's added to the pool
            removeCallback: function(platform){
                platform.scene.platformPool.add(platform)
            }
        });

        // プラットフォームのリサイクルプール
        // platform pool
        this.platformPool = this.add.group({

            // 削除したらプラットフォームグループへ
            // once a platform is removed from the pool, it's added to the active platforms group
            removeCallback: function(platform){
                platform.scene.platformGroup.add(platform)
            }
        });

        // コイングループ
        // group with all active coins.
        this.coinGroup = this.add.group({

            // 削除したらリサイクルプールへ
            // once a coin is removed, it's added to the pool
            removeCallback: function(coin){
                coin.scene.coinPool.add(coin)
            }
        });

        // コインのリサイクルプール
        // coin pool
        this.coinPool = this.add.group({

            // 削除したらコイングループへ
            // once a coin is removed from the pool, it's added to the active coins group
            removeCallback: function(coin){
                coin.scene.coinGroup.add(coin)
            }
        });

        // 炎グループ
        // group with all active firecamps.
        this.fireGroup = this.add.group({

            // 削除したらリサイクルプールへ
            // once a firecamp is removed, it's added to the pool
            removeCallback: function(fire){
                fire.scene.firePool.add(fire)
            }
        });

        // 炎のリサイクルプール
        // fire pool
        this.firePool = this.add.group({

            // 削除したら炎グループへ
            // once a fire is removed from the pool, it's added to the active fire group
            removeCallback: function(fire){
                fire.scene.fireGroup.add(fire)
            }
        });

        // 山々の追加
        // adding a mountain
        this.addMountains()

        // プラットフォームの数初期化
        // keeping track of added platforms
        this.addedPlatforms = 0;

        // 連続ジャンプ数初期化
        // number of consecutive jumps made by the player so far
        this.playerJumps = 0;

        // プラットフォームの追加(横幅、中心、高さ)
        // adding a platform to the game, the arguments are platform width, x position and y position
        this.addPlatform(game.config.width, game.config.width / 2, game.config.height * gameOptions.platformVerticalLimit[1]);

        // プレイヤーの生成、重力設定
        // adding the player;
        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height * 0.7, "player");
        this.player.setGravityY(gameOptions.playerGravity);
        this.player.setDepth(2);

        // Depth 山を手前に表示しない
        // 0 or 1 山
        // 2 プレイヤー、プラットフォーム、コイン、炎

        // 焼け死んだフラグ
        // the player is not dying
        this.dying = false;

        // プレイヤーとプラットフォームの衝突判定をする
        // setting collisions between the player and the platform group
        this.platformCollider = this.physics.add.collider(this.player, this.platformGroup, function(){

            // 着地したら走る
            // play "run" animation if the player is on a platform
            if(!this.player.anims.isPlaying){
                this.player.anims.play("run");
            }
        }, null, this);

        // プレイヤーとコインの重なり判定をする
        // setting collisions between the player and the coin group
        this.physics.add.overlap(this.player, this.coinGroup, function(player, coin){

            // アニメーション
            this.tweens.add({
                targets: coin, // コインを
                y: coin.y - 100, // ちょっと上へ移動
                alpha: 0, // 非表示
                duration: 800, // 時間
                ease: "Cubic.easeOut", // 動きの種類
                callbackScope: this,
                onComplete: function(){ // リサイクルへ
                    this.coinGroup.killAndHide(coin);
                    this.coinGroup.remove(coin);
                }
            });

        }, null, this);

        // プレイヤーと炎の重なり判定をする
        // setting collisions between the player and the fire group
        this.physics.add.overlap(this.player, this.fireGroup, function(player, fire){

            this.dying = true; // 焼け死ぬ
            this.player.anims.stop(); // アニメ停止
            this.player.setFrame(2); // 黒こげ画像のフレームへ
            this.player.body.setVelocityY(-200); // 上に
            this.physics.world.removeCollider(this.platformCollider); // プレイヤーの衝突判定削除

        }, null, this);

        // クリック・タッチはjumpハンドラへ
        // checking for input
        this.input.on("pointerdown", this.jump, this);
    }

    // 山々の追加
    // adding mountains
    addMountains(){
        // 一番右の山の位置
        let rightmostMountain = this.getRightmostMountain();
        // 一番右の山の位置が画面横幅2倍より左であれば山を追加する
        if(rightmostMountain < game.config.width * 2){
            // 山画像を一番右の山から右へ100～350離れて下に配置し0～100下に下げる
            let mountain = this.physics.add.sprite(rightmostMountain + Phaser.Math.Between(100, 350), game.config.height + Phaser.Math.Between(0, 100), "mountain");
            mountain.setOrigin(0.5, 1); // x中央、y下から
            mountain.body.setVelocityX(gameOptions.mountainSpeed * -1)
            this.mountainGroup.add(mountain);
            if(Phaser.Math.Between(0, 1)){
                mountain.setDepth(1);
            }
            mountain.setFrame(Phaser.Math.Between(0, 3)); // 4種類のどれか
            this.addMountains(); // 再帰呼び出しし右に追加する
        }
    }

    // 一番右の山を取得する
    // getting rightmost mountain x position
    getRightmostMountain(){
        let rightmostMountain = -200;
        this.mountainGroup.getChildren().forEach(function(mountain){
            rightmostMountain = Math.max(rightmostMountain, mountain.x);
        })
        return rightmostMountain;
    }

    // プラットフォームを追加する
    // the core of the script: platform are added from the pool or created on the fly
    addPlatform(platformWidth, posX, posY){
        this.addedPlatforms ++;
        let platform;
        if(this.platformPool.getLength()){
            // リサイクルプールにあればそれを使う
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.y = posY;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
            let newRatio =  platformWidth / platform.displayWidth;
            platform.displayWidth = platformWidth;
            platform.tileScaleX = 1 / platform.scaleX;
        }
        else{
            // 新しいタイルスプライトを追加する
            platform = this.add.tileSprite(posX, posY, platformWidth, 32, "platform");
            this.physics.add.existing(platform);
            platform.body.setImmovable(true);
            platform.body.setVelocityX(Phaser.Math.Between(gameOptions.platformSpeedRange[0], gameOptions.platformSpeedRange[1]) * -1);
            platform.setDepth(2);
            this.platformGroup.add(platform);
        }
        // 次のプラットフォームへの距離を決める
        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);

        // はじめのプラットフォームでなければコインや炎を追加を確率で決める
        // if this is not the starting platform...
        if(this.addedPlatforms > 1){

            // コインの追加
            // is there a coin over the platform?
            if(Phaser.Math.Between(1, 100) <= gameOptions.coinPercent){
                if(this.coinPool.getLength()){
                    // リサイクルプールにあればそれを使う
                    let coin = this.coinPool.getFirst();
                    coin.x = posX;
                    coin.y = posY - 96;
                    coin.alpha = 1;
                    coin.active = true;
                    coin.visible = true;
                    this.coinPool.remove(coin);
                }
                else{
                    // 新しくコインを追加
                    let coin = this.physics.add.sprite(posX, posY - 96, "coin");
                    coin.setImmovable(true);
                    coin.setVelocityX(platform.body.velocity.x);
                    coin.anims.play("rotate");
                    coin.setDepth(2);
                    this.coinGroup.add(coin);
                }
            }

            // 炎
            // is there a fire over the platform?
            if(Phaser.Math.Between(1, 100) <= gameOptions.firePercent){
                if(this.firePool.getLength()){
                    // リサイクルプールにあればそれを使う
                    let fire = this.firePool.getFirst();
                    fire.x = posX - platformWidth / 2 + Phaser.Math.Between(1, platformWidth);
                    fire.y = posY - 46;
                    fire.alpha = 1;
                    fire.active = true;
                    fire.visible = true;
                    this.firePool.remove(fire);
                console.log("fire", fire.depth);
                }
                else{
                    // 新しく炎を追加
                    let fire = this.physics.add.sprite(posX - platformWidth / 2 + Phaser.Math.Between(1, platformWidth), posY - 46, "fire");
                    fire.setImmovable(true);
                    fire.setVelocityX(platform.body.velocity.x);
                    //fire.setSize(8, 2, true); // 物理ボディを設定(表示サイズより当たり判定を小さくする)
                    fire.setBodySize(2, 2, true); // 物理ボディを設定(表示サイズより当たり判定を小さくする)
                    fire.anims.play("burn");
                    fire.setDepth(2);
                    this.fireGroup.add(fire);
                }
            }
        }
    }

    // ジャンプ
    // the player jumps when on the ground, or once in the air as long as there are jumps left and the first jump was on the ground
    // and obviously if the player is not dying
    jump(){
        // 焼け死んでなく、地面に接しているか連続ジャンプ可能数に達していなければジャンプする
        if((!this.dying) && (this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps))){
            if(this.player.body.touching.down){
                this.playerJumps = 0; // 着地していれば連続ジャンプ数クリア
            }
            this.player.setVelocityY(gameOptions.jumpForce * -1); // 上に向かう
            this.playerJumps ++;

            // アニメは停止
            // stops animation
            this.player.anims.stop();
        }
    }

    update(){

        // 画面境界まで落ちたらメインシーンへ
        // game over
        if(this.player.y > game.config.height){
            this.scene.start("PlayGame");
        }

        // プレイヤーのx位置はプラットフォームと一緒に移動しない
        this.player.x = gameOptions.playerStartPosition;

        // プラットフォームのリサイクル
        // recycling platforms
        let minDistance = game.config.width;
        let rightmostPlatformHeight = 0;
        this.platformGroup.getChildren().forEach(function(platform){
            // プラットフォームの右端から画面右境界までの距離
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            if(platformDistance < minDistance){
                minDistance = platformDistance; // 最小の距離
                rightmostPlatformHeight = platform.y; // そのy座標
            }
            if(platform.x < - platform.displayWidth / 2){ // 画面から全部出たら削除する
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        // コインのリサイクル
        // recycling coins
        this.coinGroup.getChildren().forEach(function(coin){
            if(coin.x < - coin.displayWidth / 2){ // 画面から出たら削除
                this.coinGroup.killAndHide(coin);
                this.coinGroup.remove(coin);
            }
        }, this);

        // 炎のリサイクル
        // recycling fire
        this.fireGroup.getChildren().forEach(function(fire){
            if(fire.x < - fire.displayWidth / 2){ // 画面から出たら削除
                this.fireGroup.killAndHide(fire);
                this.fireGroup.remove(fire);
            }
        }, this);

        // 山のリサイクル
        // recycling mountains
        this.mountainGroup.getChildren().forEach(function(mountain){
            if(mountain.x < - mountain.displayWidth){ // 画面から出たら
                let rightmostMountain = this.getRightmostMountain();
                mountain.x = rightmostMountain + Phaser.Math.Between(100, 350); // 右端の山の右側に配置
                mountain.y = game.config.height + Phaser.Math.Between(0, 100);
                mountain.setFrame(Phaser.Math.Between(0, 3)); // 4種類の山から選ぶ
                if(Phaser.Math.Between(0, 1)){
                    mountain.setDepth(1);
                }
                console.log("mountainGroup", mountain.depth);
            }
        }, this);

        // 次のプラットフォーム追加
        // adding new platforms
        if(minDistance > this.nextPlatformDistance){
            let nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
            let platformRandomHeight = gameOptions.platformHeighScale * Phaser.Math.Between(gameOptions.platformHeightRange[0], gameOptions.platformHeightRange[1]);
            let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;
            let minPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[0];
            let maxPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[1];
            let nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2, nextPlatformHeight);
        }
    }
};

// ウィンドウのリサイズ時の処理
function resize(){
    // ウィンドウの縦横比に合わせてキャンバスサイズを変更する
    // ゲームの縦横比より横長なら横を短く、縦長なら縦を短く
    let canvas = document.querySelector("canvas");
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let windowRatio = windowWidth / windowHeight;
    let gameRatio = game.config.width / game.config.height;
    if(windowRatio < gameRatio){
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else{
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}