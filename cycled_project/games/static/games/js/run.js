$(document).ready(function() {    
    // サイズ取得
    const $container = $('#game-container');
    const width = $container.width();
    const height = $container.height();

    // Phaserゲームの設定
    const config = {
        type: Phaser.AUTO,
        width: width,
        height: height,
        physics: {
            default: 'arcade',
            arcade: { 
                gravity: { y: 1000 }, 
                debug: true, 
            }
        },
        parent: 'game-container', // ここで表示先を指定
        scene: {
            preload: preload,
            create: create,
            update: update
        },
        backgroundColor: 0x0c88c7, // 背景色
    };

    // ゲームインスタンスの作成
    const game = new Phaser.Game(config);
    checkGame(game);

    let player;
    let cursors;
    let ground;

    function preload() {
        // player
        this.load.spritesheet("player", img_player, {
            frameWidth: 24,
            frameHeight: 48
        });
        // 地面
        this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
        // background
        this.load.image('back', 'https://labs.phaser.io/assets/skies/space3.png');
    }


    function create() {
        // 背景を画面に追加
        this.add.image(width/2, height/2, 'back');  // 画面中央に背景を表示

        // プレイヤーを中央に配置
        player = this.physics.add.sprite(width/4, height/4, 'player');
        // プレイヤーの大きさを変更
        player.setScale(0.5);
        player.setCollideWorldBounds(true); // プレイヤーが画面外に出ないように
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1
        });

        // 地面を画面下部に配置
        ground = this.physics.add.staticGroup();
        ground.create(width / 2, height - 50, 'ground').setScale(2).refreshBody(); // 地面

        // プレイヤーと地面を衝突させる
        this.physics.add.collider(player, ground);

        // カーソルキーの設定
        // WASDキーを検出
        cursors = {
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };
        // クリックまたはタップでジャンプ
        this.input.on('pointerdown', jump, this);
    }

    function update() {
        // プレイヤーの移動
        player.setVelocityX(0); // 左右の移動を初期化

        if (cursors.left.isDown) {
            player.setVelocityX(-160); // 左に移動
            player.anims.play('left', true); // 左向きアニメーション
            player.setFlipX(true); // 左向きなのでスプライトを反転
        }
        else if (cursors.right.isDown) {
            player.setVelocityX(160); // 右に移動
            player.anims.play('right', true); // 右向きアニメーション
            player.setFlipX(false); // 右向きなのでスプライトを反転解除
        }
        else {
            player.anims.stop();
        }
    }
    function jump() {
        // クリックやタップでジャンプ
        if (player.body.touching.down) {
            player.setVelocityY(-330); // 上にジャンプ
            player.anims.play('jump', true); // ジャンプアニメーション
        }
    }
});