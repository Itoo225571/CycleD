import { gameOptions } from '../config.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, texture, config) {
        super(scene, gameOptions.playerStartPosition, 0, texture + 'Run');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.scene = scene;

        // 個別性能をプロパティに保存
        this.initSpeed = config.speed || gameOptions.playerStartSpeed;
        this.accel = config.accel || gameOptions.playerAccel;
        this.jumpForce = config.jumpForce || gameOptions.jumpForce;
        this.gravity = config.gravity || gameOptions.playerGravity;
        this.jumps = config.jumps || gameOptions.jumps;
        this.jump_count = 0;
        this.lives = config.lives || gameOptions.lives;

        this.lastAccelTime = 0; // 最後に加速した時刻（秒単位）
        this.accelInterval = 30; // 加速の間隔（秒）
        this.speed = this.initSpeed;

        this.distPre = 0;
        this.dist = 0;

        // 物理プロパティに反映
        this.setDisplaySize(gameOptions.oneBlockSize, gameOptions.oneBlockSize);
        this.body.setGravityY(this.gravity);

        this.defaultBodyHeight = this.body.height;
        this.enlargedBodyHeight = this.defaultBodyHeight + 10;
    }

    update(elapsedTime,cam) {
        if (this.scene.isPaused) return;

        // 現在の時間（秒）に変換
        const currentTimeInSec = Math.floor(elapsedTime / 1000);
        // 30秒経過しているかどうかを確認
        if (currentTimeInSec - this.lastAccelTime >= this.accelInterval) {
            // 加速の実行
            this.speed += this.accel;
            // 最後に加速した時刻を更新
            this.lastAccelTime = currentTimeInSec;
        }
        this.setVelocityX(this.speed);

        if (this.distPre === 0) this.dist = this.x;
        else this.dist = this.distPre + this.x;     // loseLife以前の距離も含める

        // 位置合わせ
        let playerPos = cam.scrollX + gameOptions.playerStartPosition;   //本来いるべき位置
        var diff = playerPos - this.x;
        if (diff > 10 && this.body.blocked.down) {
            // 目標位置に向かって0.5秒かけて戻すための速度調整
            let duration = 0.5; // 0.5秒
            let targetSpeed = diff / duration; // 目標速度（距離 / 時間）
            this.setVelocityX(Math.sign(diff) * targetSpeed + this.speed); // 目標位置に向かって移動
        }

        if (this.body.blocked.down) {
            // 地面にいるときは「run」アニメーション
            this.anims.play('run', true);
            // ⬇️ 着地したら当たり判定を元に戻す
            // this.body.setSize(this.body.width, this.defaultBodyHeight);
            // this.body.setOffset(0, this.originalOffsetY); // 必要なら元のオフセットにも戻す
        }
    }

    jump() {
        if (this.body.blocked.down || (this.jump_count > 0 && this.jump_count < this.jumps)) {
            if(this.body.blocked.down) {
                this.jump_count = 0; // 地面に着地していたらジャンプ回数リセット
            }

            this.setVelocityY(this.jumpForce * -1); // 上方向にジャンプ
            this.jump_count++; // ジャンプ回数をカウント
            if(this.jump_count === 1) {
                this.anims.play('jump', true);  // 最初のジャンプは通常のジャンプアニメーション
            } else {
                this.anims.play(this.scene.anims.get('jump_ex') ? 'jump_ex' : 'jump', true);
            }

            // ⬆️ ジャンプ中はY当たり判定を増やす
            // this.body.setSize(this.body.width, this.enlargedBodyHeight);
            // this.body.setOffset(0, this.body.offset.y + 10); // オフセット調整（下に伸ばす）
        }
    }

    loseLife() {
        this.lives--; // 残機を減らす
        this.distPre += this.dist;  // 今の距離を追加
        this.initPlayer();
        return Boolean(this.lives > 0);     //gameoverか否か
    }

    initPlayer() {
        this.xCalc = gameOptions.playerStartPosition;
        this.lastAccelTime = 0  // 加速時間のリセット
        this.speed = this.initSpeed;    //速度のリセット

    }
}
