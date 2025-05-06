import { gameOptions } from '../config.js';

export default class Player extends Phaser.Physics.Matter.Sprite {
    constructor(scene, config) {
        // Matterでは座標指定が必須（this.scene.game.config などにアクセス不可なため scene.scale.height を使用）
        const startX = gameOptions.playerStartPosition;
        const startY = scene.scale.height / 2;

        super(scene.matter.world, startX, startY, config.key + 'Run');
        this.playerName = config.key;

        this.scene = scene;
        scene.add.existing(this);

        // 個別性能をプロパティに保存
        this.initSpeed = config.speed;
        this.accel = config.accel;
        this.jumpForce = config.jumpForce;
        this.jumps = config.jumps;
        this.lives = config.lives;
        this.chargeSkill = config.chargeSkill;  // デフォルト
        console.log(this.initSpeed,this.accel,this.jumpForce,this.jumps,this.lives)

        this.speed = this.initSpeed;
        this.jump_count = 0;

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

        this.just_jumped = false;

        this.body.label = 'player';
    }

    update(elapsedTime, cam) {
        if (this.scene.scene.isPaused('PlayScene')) {
            return;
        }

        var isGrounded = this.isOnGround();

        // 60秒後にspeed + accel 分だけになっている
        this.speed = this.initSpeed + this.accel * elapsedTime / 1000 / 60;
        // this.speed = this.initSpeed;

        // 水平方向の速度を維持（Matter.jsでは setVelocity を毎フレーム使う）
        this.setVelocityX(this.speed);

        // 移動距離の加算 (1ブロック当たり1mとする)
        this.dist = (this.x - gameOptions.playerStartPosition) / gameOptions.oneBlockSize;

        // カメラ位置に合わせる
        let playerPos = cam.scrollX + gameOptions.playerStartPosition;
        let diff = playerPos - this.x;
        if (Math.abs(diff) > 10 && isGrounded) {
            let correction = diff /10;
            this.setVelocityX(this.speed + correction);
        }

        // 地面にいるときは run アニメーション
        if (isGrounded) {
            this.anims.play(this.playerName + 'Run', true);
            this.jump_count = 0;
            
            // this.setIgnoreGravity(true);  // 重力を無効にする
            // this.setVelocityY(0);         // ついでに下方向の速度をリセット
        }
    }

    jump(onEnemy=false) {
        var isGrounded = onEnemy || this.isOnGround();

        if (this.jump_count < this.jumps) {
            // Matterでは setVelocityY はないので force を使う方が自然
            this.setVelocityY(-Math.abs(this.jumpForce)); // jumpForce を適度に調整

            if (isGrounded) {
                this.anims.play(this.playerName + 'Jump', true);
            } else {
                // 空中にいる場合は特殊ジャンプにする
                var name = this.scene.anims.get(this.playerName + 'Jump_ex') ? this.playerName + 'Jump_ex' : this.playerName + 'Jump';
                this.anims.play(name, true);
                this.jump_count++;
            }

            // just_jumped を 0.5秒だけ true にする
            this.just_jumped = true;
            this.scene.time.delayedCall(500, () => {
                this.just_jumped = false;
            });
        }
    }

    isOnGround() {
        if (this.just_jumped)   return false;   //ジャンプしたばかりはfalseを返す
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
    
        return isGround;
    }
    
    loseLifePlayer() {
        this.lives--;
        this.distPre += this.dist;
        this.initPlayer();
        return this.lives > 0;
    }

    initPlayer() {
        this.speed = this.initSpeed;
        // this.chargeBar.reset();  // リセットしなくてもいい

        // 位置と速度を初期化するならここ
        this.setVelocity(0, 0);
        this.setPosition(gameOptions.playerStartPosition, this.scene.scale.height / 2);
    }

    createChargeBar(bgBar, chargeBar) {
        this.chargeBar = new ChargeBar(this, bgBar, chargeBar);
        this.chargeBar.reset();
    }
}

class ChargeBar {
    constructor(player, bgBar, chargeBar) {
        this.player = player;
        // 背景バー
        this.bgBar = bgBar;
        // チャージバー（前面）
        this.chargeBar = chargeBar;

        this.maxWidth = bgBar.width;
        this.charge = 0;     // 現在のチャージ量（0〜1）
        this.speed = 0.01;   // チャージ速度（任意）
    }

    chargeUp(amount = this.speed) {
        this.charge = Phaser.Math.Clamp(this.charge + amount, 0, 1);
        this.chargeBar.width = this.maxWidth * this.charge;
        if (this.charge >= 1)   this.onChargeFull();
    }

    reset() {
        this.charge = 0;
        this.chargeBar.width = 0;
    }

    onChargeFull() {
        this.reset();
        this.player.chargeSkill();
    }
}