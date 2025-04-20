export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, config) {
        super(scene, x, y, config.key);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(config.scale || 1);
        this.setCollideWorldBounds(true);

        this.speed = config.speed || 160;
        this.jumpPower = config.jumpPower || 330;

        this.anims.create({
            key: 'move',
            frames: scene.anims.generateFrameNumbers(config.key, { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1
        });
    }

    moveLeft() {
        this.setVelocityX(-this.speed);
        this.anims.play('move', true);
        this.setFlipX(true);
    }

    moveRight() {
        this.setVelocityX(this.speed);
        this.anims.play('move', true);
        this.setFlipX(false);
    }

    stop() {
        this.setVelocityX(0);
        this.anims.stop();
    }

    jump() {
        if (this.body.blocked.down) {
            this.setVelocityY(-this.jumpPower);
        }
    }
}
