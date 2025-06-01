import { gameOptions,gameConfig,CATEGORY } from '../config.js';

export class Player extends Phaser.Physics.Matter.Sprite {
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
        // skill関係
        this.chargeSkill = config.chargeSkill || (() => {});
        this.skillEndEvent = null;
        this.onSkill = false;
        this.invincible = false;
        this.defence = 0;

        if (gameConfig.physics.matter.debug)    this.jumps=1000;
        if (gameConfig.physics.matter.debug)    this.lives=1000;
        // if (gameConfig.physics.matter.debug)    this.invincible=true;

        this.speed = this.initSpeed;
        this.jump_count = 0;

        this.distPre = 0;
        this.dist = 0;
        this.prevBlockX = 0;
        this.coin_bronze = 0;

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
        this.setCollisionCategory(CATEGORY.PLAYER);
        this.setCollidesWith(CATEGORY.ENEMY | CATEGORY.WALL | CATEGORY.ITEM | CATEGORY.TRAP | CATEGORY.CEILING);

        this.just_jumped = false;

        // サウンド追加
        this.jumpSound = this.scene.sound.add('jumpSound',{ volume: 0.3,});

        this.body.label = 'player';
    }

    update(elapsedTime, cam) {
        if (this.scene.scene.isPaused('PlayScene')) {
            return;
        }

        var isGrounded = this.isOnGround();

        // 60秒後にspeed + accel 分だけになっている
        // スピード計算と最大スピードの制限
        this.speed = Math.min(this.initSpeed + (this.accel * elapsedTime) / 1000 / 60, gameOptions.maxSpeed);

        // this.speed = this.initSpeed;

        // 水平方向の速度を維持（Matter.jsでは setVelocity を毎フレーム使う）
        this.setVelocityX(this.speed);

        // 移動距離の加算 (1ブロック当たり1mとする)
        this.dist = (this.x - gameOptions.playerStartPosition) / gameOptions.oneBlockSize;

        // ✅ 前回のブロックXと比較して、ブロック境界を超えたときに関数を呼ぶ
        const currentBlockX = Math.floor(this.dist);
        if (currentBlockX > this.prevBlockX) {
            for (let i = this.prevBlockX + 1; i <= currentBlockX; i++) {
                this.chargeBar.chargeUp(0.001);
            }
            this.prevBlockX = currentBlockX;
        }

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

    jump(onObject=false) {
        var isGrounded = onObject || this.isOnGround();

        if (this.jump_count < this.jumps) {
            // Matterでは setVelocityY はないので force を使う方が自然
            this.setVelocityY(-Math.abs(this.jumpForce)); // jumpForce を適度に調整
            if(!onObject)   this.jumpSound.play();  // 音声再生

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
        var targets = this.scene.mapManager.collisionTiles
            .concat(this.scene.mapManager.traps);   // trapにも足場判定を

        this.raycaster.mapGameObjects(targets, true);
    
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
        this.lives -= (1 - this.defence);   // defence分だけ軽減
        this.distPre += this.dist;
        this.initPlayer();
        return this.lives > 0;
    }

    initPlayer() {
        this.speed = this.initSpeed;
        // this.chargeBar.reset();  // リセットしなくてもいい
        this.prevBlockX = 0;
        // スキル周りをリセット
        if (this.skillEndEvent) {
            clearTimeout(this.skillEndEvent);
            if (this._onSkillEnd) {
                this._onSkillEnd();         // 保存された関数を呼び出す
                this._onSkillEnd = null;
            }
            this.onSkill = false; // 明示的にfalseに
            this.skillEndEvent = null; // 忘れずにクリーンアップ
        }
        
        this.setRotation(0);             // 角度リセット
        this.setStatic(false);       // 動的に戻す
        this.setCollisionCategory(CATEGORY.PLAYER); // 元のカテゴリに再設定
        this.setCollidesWith(CATEGORY.ENEMY | CATEGORY.WALL | CATEGORY.ITEM | CATEGORY.TRAP | CATEGORY.CEILING);
        this.setDepth(0);

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
        this.scene = player.scene;
        // 背景バー
        this.bgBar = bgBar;
        // チャージバー（前面）
        this.chargeBar = chargeBar;

        this.maxWidth = bgBar.width;
        this.charge = 0;     // 現在のチャージ量（0〜1）
        this.speed = 0.01;   // チャージ速度
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
        // if (this.player.onSkill)   return;
        
        this.player.onSkill = true;
        if (this.player.chargeSkill) this.player.chargeSkill(this.player,this.scene);
        this.player.emit('chargeFull'); // 外部でも監視可能
    }
    
}

export const chargeSkillTable = {
    DefenceBoost: (player, scene) => {
        var skillTime = 20;
        player.defence = 0.5;
        skillStartDefenceBoost(player, scene);
        createSkillEndEvent(player, skillTime, true, () => {
            player.defence = 0;
            skillEnd(player, scene);
        });
    },
    Invincibled: (player, scene) => {
        var skillTime = 10;
        player.invincible = true;
        skillStartInvincibled(player, scene);
        createSkillEndEvent(player, skillTime, true, () => {
            player.invincible = false;
            skillEnd(player, scene);
        });
    },
};

function createSkillEndEvent(player, skillTime, isDeadTriggered=true, func) {
    if (player.skillEndEvent) return;

    player.onSkill = true;

    player._onSkillEnd = (timer=false) => {
        if (isDeadTriggered || timer) func();
        player.skillEndEvent = null;
        player.onSkill = false;
    };

    player.skillEndEvent = setTimeout(() => {
        player._onSkillEnd(true);
    }, skillTime * 1000);
}

function skillStartDefenceBoost(player, scene) {
    player.setTintFill(0x4c4c4c);
}

function skillStartInvincibled(player, scene) {
    const colors = [
        0xff0000, // 赤
        0xff7f00, // オレンジ
        0xffff00, // 黄
        0x00ff00, // 緑
        0x0000ff, // 青
        0x4b0082, // インディゴ
        0x8b00ff  // バイオレット
    ];
    
    let colorIndex = 0;

    // 既存イベントあれば削除＆tintクリア
    if (player.skillTintEvent) {
        scene.time.removeEvent(player.skillTintEvent);
        player.clearTint();
        player.setBlendMode(Phaser.BlendModes.NORMAL);
        player.setAlpha(1);
    }

    player.setBlendMode(Phaser.BlendModes.ADD);  // 発光っぽく

    player.skillTintEvent = scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
            player.setTint(colors[colorIndex]);
            // alphaもゆらゆらさせる例（0.8〜1.0の間を行き来）
            let alpha = 0.8 + 0.2 * Math.sin(colorIndex * Math.PI / colors.length);
            player.setAlpha(alpha);
            colorIndex = (colorIndex + 1) % colors.length;
        }
    });
}

function skillEnd(player, scene) {
    // タイマー消去
    if (player.skillTintEvent) {
        scene.time.removeEvent(player.skillTintEvent);
        player.skillTintEvent = null;
    }
    // 元の色に戻す（tint解除）
    player.clearTint();
    player.setAlpha(1);
    player.setBlendMode(Phaser.BlendModes.NORMAL);
}
