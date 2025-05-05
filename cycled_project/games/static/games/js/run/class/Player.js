import { gameOptions } from '../config.js';

export default class Player extends Phaser.Physics.Matter.Sprite {
    constructor(scene, texture, config) {
        // Matterでは座標指定が必須（this.scene.game.config などにアクセス不可なため scene.scale.height を使用）
        const startX = gameOptions.playerStartPosition;
        const startY = scene.scale.height / 2;
        super(scene.matter.world, startX, startY, texture + 'Run');

        this.scene = scene;
        scene.add.existing(this);

        this.playerName = texture;  //player名を保存

        // 個別性能をプロパティに保存
        this.initSpeed = config.speed || gameOptions.playerStartSpeed;
        this.accel = config.accel || gameOptions.playerAccel;
        this.jumpForce = config.jumpForce || gameOptions.jumpForce;
        this.jumps = config.jumps || gameOptions.jumps;
        this.jump_count = 0;
        this.lives = config.lives || gameOptions.lives;

        this.speed = this.initSpeed;

        this.distPre = 0;
        this.dist = 0;

        // サイズ・物理設定
        this.setDisplaySize(gameOptions.oneBlockSize, gameOptions.oneBlockSize);
        this.setFixedRotation(); // 回転しないように固定

        // センサーや補助判定が必要なら、ここで `this.setBody()` をカスタム形状で定義することも可能
        this.setDepth(0);   // プレイヤーの表示順を設定
        // ray
        this.raycaster = scene.raycasterPlugin.createRaycaster();
        this.ray = this.raycaster.createRay({
            origin: { x: this.x, y: this.y },
            autoSlice: true
        });

        this.setFriction(0);          // 地面との摩擦
        this.setFrictionStatic(0);    // 静止摩擦
        this.setFrictionAir(0);       // 空気抵抗

        this.body.label = 'player';
    }

    update(elapsedTime, cam) {
        if (this.scene.isPaused) return;
        // var isGrounded = this.scene.skaterTouchingGround;
        // var isGrounded = this.body.velocity.y ===0;
        var isGrounded = this.isOnGround();

        // 60秒後にspeed + accel 分だけになっている
        this.speed = this.initSpeed + this.accel * elapsedTime / 1000 / 60;
        // this.speed = this.initSpeed;

        // 水平方向の速度を維持（Matter.jsでは setVelocity を毎フレーム使う）
        this.setVelocityX(this.speed);

        // 移動距離の加算 (1ブロック当たり1mとする)
        if (this.distPre === 0) this.dist = this.x / gameOptions.oneBlockSize;
        else this.dist = this.distPre + this.x / gameOptions.oneBlockSize;

        // カメラ位置に合わせる
        let playerPos = cam.scrollX + gameOptions.playerStartPosition;
        let diff = playerPos - this.x;
        if (Math.abs(diff) > 50 && isGrounded) {
            let correction = diff /10;
            this.setVelocityX(this.speed + correction);
        }

        // 地面にいるときは run アニメーション
        if (isGrounded) {
            this.anims.play(this.playerName + 'Run', true);
            // this.setIgnoreGravity(true);  // 重力を無効にする
            // this.setVelocityY(0);         // ついでに下方向の速度をリセット
        }
    }

    jump() {
        // 着地判定は body.velocity.y === 0 で代替（またはセンサー判定でも可能）
        // const isGrounded = Math.abs(this.body.velocity.y) < 0.01;
        // var isGrounded = this.body.velocity.y ===0;
        // var isGrounded = this.scene.skaterTouchingGround;
        var isGrounded = this.isOnGround();

        if (isGrounded || (this.jump_count > 0 && this.jump_count < this.jumps)) {
            if (isGrounded) {
                this.jump_count = 0;
            }

            // Matterでは setVelocityY はないので force を使う方が自然
            this.setVelocityY(-Math.abs(this.jumpForce)); // jumpForce を適度に調整
            this.jump_count++;

            if (this.jump_count === 1) {
                this.anims.play(this.playerName + 'Jump', true);
            } else {
                var name = this.scene.anims.get(this.playerName + 'Jump_ex') ? this.playerName + 'Jump_ex' : this.playerName + 'Jump';
                this.anims.play(name, true);
            }
        }
    }

    isOnGround() {
        this.raycaster.mapGameObjects(this.scene.mapManager.collisionTiles, true);
    
        // プレイヤーの現在位置から少し下にRayを飛ばす（角度=π/2）
        this.ray.setOrigin(this.x, this.y + this.displayHeight / 2 - 2); // 足元付近
        this.ray.setAngle(Math.PI / 2); // 下向き
        const intersection = this.ray.cast();
        
        // 地面の判定
        let isGround = false;
        if (intersection && Phaser.Math.Distance.Between(this.x, this.y, intersection.x, intersection.y) <= gameOptions.oneBlockSize) {
            isGround = true;
        }
    
        // enemyとの接触判定
        const enemies = this.scene.mapManager.enemies; // enemyが格納されている配列
        for (let enemy of enemies) {
            if (!enemy.active) continue;
            const distanceToEnemy = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (distanceToEnemy <= gameOptions.oneBlockSize) {
                isGround = true; // enemyが地面として接触したとみなす
                break;
            }
        }
    
        return isGround;
    }
    
    loseLife() {
        this.lives--;
        this.distPre += this.dist;
        this.initPlayer();
        return this.lives > 0;
    }

    initPlayer() {
        this.speed = this.initSpeed;

        // 位置と速度を初期化するならここ
        this.setVelocity(0, 0);
        this.setPosition(gameOptions.playerStartPosition, this.scene.scale.height / 2);
    }
}
