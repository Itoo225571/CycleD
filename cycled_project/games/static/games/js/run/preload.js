export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        // msgウィンドウ
        this.load.spritesheet(
            'msgWindowTile', 
            `${imgDir}Panel/panel-021.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
        // btn
        this.load.spritesheet(
            'btnTile', 
            `${imgDir}Panel/panel-000.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
        // 入力用
        this.load.spritesheet(
            'inputPrompts', 
            `${imgDir}/input_prompts.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
        // 背景画像
        this.load.image('sky', `${imgDir}background/sky.png`);
        this.load.image('mountain', `${imgDir}background/mountain.png`);
        this.load.image('mountains', `${imgDir}background/mountains.png`);
        this.load.image('mountain-trees', `${imgDir}background/mountain-trees.png`);
        this.load.image('trees', `${imgDir}background/trees.png`);

        //player
        var situations = [
            'DoubleJump',
            'Fall',
            'Hit',
            'Idle',
            'Jump',
            'Run',
            'WallJump'
        ]
        var charaNames = [
            'NinjaFrog'
        ]
        charaNames.forEach((chara) => {  // アロー関数に変更
            situations.forEach((situation) => {  // アロー関数に変更
                this.load.spritesheet(
                    chara + situation, 
                    `${imgDir}${chara}/${situation}.png`, 
                    { frameWidth: 32, frameHeight: 32 }
                );
            });
        });
        // 地面
        this.load.spritesheet('terrain', `${imgDir}/Terrain.png`, {
            frameWidth: 32,
            frameHeight: 32,
        });
    }

    create() {
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('NinjaFrogRun', { start: 0, end: 11 }),
            frameRate: 30,
            repeat: -1
        });
        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('NinjaFrogJump', { start: 0, end: 0 }),
            frameRate: 1,
            repeat: -1
        });
        this.anims.create({
            key: 'jump_ex',
            frames: this.anims.generateFrameNumbers('NinjaFrogDoubleJump', { start: 0, end: 5 }),
            frameRate: 40,
            repeat: -1
        });
        this.anims.create({
            key: 'stop',
            frames: this.anims.generateFrameNumbers('NinjaFrogIdle', { start: 0, end: 10 }),
            frameRate: 10,
            repeat: -1
        });

        // 背景レイヤーの初期化
        this.backgroundLayers = {};
        // 'sky' レイヤー（最も遠い）
        this.backgroundLayers['sky'] = this.add.image(0, 0, 'sky')
            .setOrigin(0, 0)
            .setDisplaySize(this.game.config.width, this.game.config.height);
        // 'mountain' レイヤー（遠景）
        this.backgroundLayers['mountain'] = this.add.image(0, 0, 'mountain')
            .setOrigin(0, 0)
            .setDisplaySize(this.game.config.width, this.game.config.height);
        // 'mountains' レイヤー（中景）
        this.backgroundLayers['mountains'] = this.add.image(0, 0, 'mountains')
            .setOrigin(0, 0)
            .setDisplaySize(this.game.config.width, this.game.config.height);
        // 'mountain-trees' レイヤー（手前の遠景）
        this.backgroundLayers['mountain-trees'] = this.add.image(0, 0, 'mountain-trees')
            .setOrigin(0, 0)
            .setDisplaySize(this.game.config.width, this.game.config.height);
        // 'trees' レイヤー（最も手前）
        this.backgroundLayers['trees'] = this.add.image(0, 0, 'trees')
            .setOrigin(0, 0)
            .setDisplaySize(this.game.config.width, this.game.config.height);

        // this.scene.start('PlayScene');

        this.scene.start('StartScene');
    }
}

function createFrame(scene, container, widthInTiles, heightInTiles, imgKey, color=null, alpha=1) {
    for (let ty = 0; ty < heightInTiles; ty++) {
        for (let tx = 0; tx < widthInTiles; tx++) {
            let frame = 4; // デフォルト背景

            // 角
            if (tx === 0 && ty === 0) frame = 0; // 左上
            else if (tx === widthInTiles - 1 && ty === 0) frame = 2; // 右上
            else if (tx === 0 && ty === heightInTiles - 1) frame = 6; // 左下
            else if (tx === widthInTiles - 1 && ty === heightInTiles - 1) frame = 8; // 右下

            // 縁
            else if (ty === 0) frame = 1; // 上
            else if (ty === heightInTiles - 1) frame = 7; // 下
            else if (tx === 0) frame = 3; // 左
            else if (tx === widthInTiles - 1) frame = 5; // 右

            const tile = scene.add.image(tx * 16, ty * 16, imgKey, frame).setOrigin(0);
            if (color) tile.setTint(color);
            tile.setAlpha(alpha);        // 半透明
            container.add(tile);
        }
    }
    return container;
}

export function createMsgWindow(scene, messages = [''], delay = 0) {
    const info = {
        x: 0,
        y: 500,
        width: 75,
        height: 15,
    };
    const per_length = 16;

    let container = scene.add.container(info.x, info.y);
    const widthInTiles = info.width;
    const heightInTiles = info.height;
    // ウィンドウの幅を計算（16px × タイル数）
    const windowWidth = widthInTiles * 16;
    // ウィンドウをゲーム画面の中央に配置するために、オフセットを調整
    container.setPosition((scene.scale.width - windowWidth) / 2, info.y); // x軸中央に
    const win = createFrame(scene, container, widthInTiles, heightInTiles,'msgWindowTile',0x000000, 0.5)

    const maxWidth = info.width * per_length - 16 * 5;

    const text = scene.add.text(
        win.x + per_length * 2,
        info.y + per_length * 2,
        '',
        {
            fontFamily: 'DotGothic16',
            fontSize: '32px',
            color: '#fff',
            wordWrap: { width: maxWidth, useAdvancedWrap: true },
            lineSpacing: 16
        }
    );

    // 全文を即時表示
    if (delay === 0) {
        text.setText(messages.join('\n'));
    } else {
        let currentMessageIndex = 0;
        let currentCharIndex = 0;
        let currentText = '';

        scene.time.addEvent({
            delay: delay,
            loop: true,
            callback: () => {
                if (currentMessageIndex < messages.length) {
                    const message = messages[currentMessageIndex];

                    if (currentCharIndex < message.length) {
                        currentText += message[currentCharIndex];
                        text.setText(currentText);
                        currentCharIndex++;
                    } else {
                        currentMessageIndex++;
                        currentCharIndex = 0;
                        currentText += '\n';
                    }
                }
            },
        });
    }

    scene.add.container(0, 0, [win, text]);
}

export function createBtn(x, y, scene, content, option = {}) {
    const per_length = 16;
    const info = {
        contentWidth: option.width || 36,  // option.contentWidth が undefined の場合、デフォルトで36
        contentHeight: option.height || 36,  // option.contentHeight が undefined の場合、デフォルトで36
        contentColor: option.color || 0,    // デフォは黒

        btnWidth: option.button ? option.button.width || 40 : 40,  // option.button が undefined の場合、デフォルトで40
        btnHeight: option.button ? option.button.height || 6 : 6,  // option.button が undefined の場合、デフォルトで6
        btnColor: option.button ? option.button.color || 0xffffff : 0xffffff,  // option.button が undefined の場合、デフォルトで白
    };

    // 中央配置処理
    const gameWidth = scene.scale.width;
    const gameHeight = scene.scale.height;

    const posX = option.centerX ? (gameWidth - info.btnWidth * per_length) / 2 : x;
    const posY = option.centerY ? (gameHeight - info.btnHeight * per_length) / 2 : y;

    const container = scene.add.container(posX, posY);

    createFrame(scene, container, info.btnWidth, info.btnHeight, 'btnTile', 0xffffff);

    // テキスト作成
    const hexColor = info.contentColor;
    if (option.type === 'image') {
        // 'content'に指定された画像を表示
        const image = scene.add.image(
            (info.btnWidth * per_length) / 2,
            (info.btnHeight * per_length) / 2,
            content,  // 'content'は画像のキー
            option.order || 0,
        ).setOrigin(0.5);
        image.setDisplaySize(info.contentWidth, info.contentHeight);
        image.setTint(hexColor);
        container.add(image);
    } else {
        var cssColor = `#${hexColor.toString(16).padStart(6, '0')}`;  // 変換
        const text = scene.add.text(
            (info.btnWidth * per_length) / 2,
            (info.btnHeight * per_length) / 2,
            content,
            {
                fontFamily: option.fontFamily || 'DotGothic16',
                fontSize: `${info.contentWidth}px`,
                color: cssColor,
            }
        ).setOrigin(0.5);
        container.add(text);
    }

    // ヒットエリア（透明）
    const buttonColor = info.btnColor;
    const hitArea = scene.add.rectangle(0, 0, info.btnWidth * per_length, info.btnHeight * per_length, buttonColor, 0);
    hitArea.setOrigin(0);
    hitArea.setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => container.setAlpha(0.8));
    hitArea.on('pointerout', () => container.setAlpha(1));

    container.add(hitArea);

    return { container, hitArea };
}
