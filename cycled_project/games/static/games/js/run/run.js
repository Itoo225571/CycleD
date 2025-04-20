import Player from './player.js';

export default class RunScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RunScene' });
    }

    preload() {
        // JSON読み込み
        this.load.json('playerData', json_player);
        // 地面
        this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
        // background
        this.load.image('background', 'https://labs.phaser.io/assets/skies/space3.png');
    }

    create() {
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;

        this.background = this.add.image(0, 0, 'background').setOrigin(0, 0).setScrollFactor(0); // ←カメラの動きと無関係に固定表示
        this.ground = this.physics.add.staticGroup();
        this.groundSprite = this.ground.create(screenWidth / 2, screenHeight - 25, 'ground')
            .setDisplaySize(screenWidth, 50)
            .refreshBody();

        const players = this.cache.json.get('playerData');
        const playerInfo = players[0]; // たとえば1人目を選ぶ
        // スプライトシートをロード（注意：preload中には load できないので create 内で再ロードするなら工夫が必要）
        this.load.spritesheet(playerInfo.key, playerInfo.img, {
            frameWidth: playerInfo.frameWidth,
            frameHeight: playerInfo.frameHeight
        });

        // キーボード操作の登録を先にしておく
        this.cursors = this.input.keyboard.createCursorKeys();
    
        this.load.once('complete', () => {
            this.player = new Player(this, screenWidth/4, screenHeight/4, playerInfo);
            // 衝突判定を追加！
            this.physics.add.collider(this.player, this.ground);
            // カメラでプレイヤーを追いかける！
            this.cameras.main.startFollow(this.player);
            this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, screenHeight); // 無限に横に進むイメージ
        });
    
        this.load.start(); // create 中に呼ぶ必要あり
    }
    

    update() {
        if (!this.player) return; // player がロードされていなければ何もしない

        // 背景と地面を視差スクロール
        this.background.tilePositionX = this.player.x * 0.2;
        this.ground.tilePositionX = this.player.x * 0.5;

        this.player.moveRight(); // ←常に右に進む
        // 入力はジャンプだけにする
        if (this.input.activePointer.isDown || this.cursors.up.isDown) {
            this.player.jump();
        }
    }
}
