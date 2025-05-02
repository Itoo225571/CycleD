import { gameOptions } from '../config.js';

export default class Player extends Phaser.Physics.Matter.Sprite {
    constructor(scene, texture, config) {
        // Matterでは座標指定が必須（this.scene.game.config などにアクセス不可なため scene.scale.height を使用）
        const startX = gameOptions.playerStartPosition;
        const startY = scene.scale.height / 2;
        super(scene.matter.world, startX, startY, texture + 'Run');

        this.scene = scene;
        scene.add.existing(this);

        // 個別性能をプロパティに保存
        this.initSpeed = config.speed || gameOptions.playerStartSpeed;
        this.accel = config.accel || gameOptions.playerAccel;
        this.jumpForce = config.jumpForce || gameOptions.jumpForce;
        this.jumps = config.jumps || gameOptions.jumps;
        this.jump_count = 0;
        this.lives = config.lives || gameOptions.lives;

        this.lastAccelTime = 0;
        this.accelInterval = 30;
        this.speed = this.initSpeed;

        this.distPre = 0;
        this.dist = 0;

        // サイズ・物理設定
        this.setDisplaySize(gameOptions.oneBlockSize, gameOptions.oneBlockSize);
        // プレイヤーの当たり判定を円形に設定
        this.setBody({
            type: 'circle',  // 形状を円形に設定
            radius: gameOptions.oneBlockSize / 2  // 半径を設定
        });
        this.setFixedRotation(); // 回転しないように固定

        // センサーや補助判定が必要なら、ここで `this.setBody()` をカスタム形状で定義することも可能
        this.setDepth(0);   // プレイヤーの表示順を設定
    }

    update(elapsedTime, cam) {
        if (this.scene.isPaused) return;

        // 現在の時間（秒）
        const currentTimeInSec = Math.floor(elapsedTime / 1000);
        if (currentTimeInSec - this.lastAccelTime >= this.accelInterval) {
            this.speed += this.accel;
            this.lastAccelTime = currentTimeInSec;
        }

        // 水平方向の速度を維持（Matter.jsでは setVelocity を毎フレーム使う）
        this.setVelocityX(this.speed);

        // 移動距離の加算
        if (this.distPre === 0) this.dist = this.x;
        else this.dist = this.distPre + this.x;

        // カメラ位置に合わせる
        let playerPos = cam.scrollX + gameOptions.playerStartPosition;
        let diff = playerPos - this.x;
        if (Math.abs(diff) > 50 && this.body.velocity.y ===0) {
            let correction = diff /10;
            this.setVelocityX(this.speed + correction);
        }

        // 地面にいるときは run アニメーション
        if (this.body.velocity.y === 0) {
            this.anims.play('run', true);
        }
    }

    jump() {
        // 着地判定は body.velocity.y === 0 で代替（またはセンサー判定でも可能）
        const isGrounded = Math.abs(this.body.velocity.y) < 0.01;

        if (isGrounded || (this.jump_count > 0 && this.jump_count < this.jumps)) {
            if (isGrounded) {
                this.jump_count = 0;
            }

            // Matterでは setVelocityY はないので force を使う方が自然
            this.setVelocityY(-Math.abs(this.jumpForce)); // jumpForce を適度に調整
            this.jump_count++;

            if (this.jump_count === 1) {
                this.anims.play('jump', true);
            } else {
                this.anims.play(this.scene.anims.get('jump_ex') ? 'jump_ex' : 'jump', true);
            }
        }
    }

    loseLife() {
        this.lives--;
        this.distPre += this.dist;
        this.initPlayer();
        return this.lives > 0;
    }

    initPlayer() {
        this.lastAccelTime = 0;
        this.speed = this.initSpeed;

        // 位置と速度を初期化するならここ
        this.setVelocity(0, 0);
        this.setPosition(gameOptions.playerStartPosition, this.scene.scale.height / 2);
    }
}
