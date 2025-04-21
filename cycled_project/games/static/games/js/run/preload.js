export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        this.load.image('platform', imgDir_test + 'platform.png');
        this.load.spritesheet('player', `${imgDir_test}player${2}.png`, { frameWidth: 16, frameHeight: 16 });
    }

    create() {
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 15,
            repeat: -1
        });
        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('player', { start: 3, end: 3 }),
            frameRate: 1,
            repeat: -1
        });
        this.anims.create({
            key: 'jump_ex',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 25,
            repeat: -1
        });
        this.anims.create({
            key: 'stop',
            frames: this.anims.generateFrameNumbers('player', { start: 5, end: 5 }),
            frameRate: 1,
            repeat: -1
        });

        // this.scene.start('PlayScene');
        this.scene.start('StartScene');
    }
}
