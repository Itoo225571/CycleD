export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        this.load.image('platform', imgDir_test + 'platform.png');
        // tilemap
        this.load.spritesheet(
            'tilemap', 
            `${imgDir}tilemap.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
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
    }

    create() {
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('tilemap', { start: 261, end: 264 }),
            frameRate: 15,
            repeat: -1
        });
        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('tilemap', { start: 264, end: 264 }),
            frameRate: 1,
            repeat: -1
        });
        this.anims.create({
            key: 'jump_ex',
            frames: this.anims.generateFrameNumbers('tilemap', { start: 261, end: 264 }),
            frameRate: 25,
            repeat: -1
        });
        this.anims.create({
            key: 'stop',
            frames: this.anims.generateFrameNumbers('tilemap', { start: 266, end: 266 }),
            frameRate: 1,
            repeat: -1
        });

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
        width: 40,
        height: 6
    };

    // 中央配置処理
    const gameWidth = scene.scale.width;
    const gameHeight = scene.scale.height;

    const posX = option.centerX ? (gameWidth - info.width * per_length) / 2 : x;
    const posY = option.centerY ? (gameHeight - info.height * per_length) / 2 : y;

    const container = scene.add.container(posX, posY);

    createFrame(scene, container, info.width, info.height, 'btnTile', 0xffffff);

    // テキスト作成
    const text = scene.add.text(
        (info.width * per_length) / 2,
        (info.height * per_length) / 2,
        content,
        {
            fontFamily: option.fontFamily || 'DotGothic16',
            fontSize: '32px',
            color: '#000000'
        }
    ).setOrigin(0.5);
    container.add(text);

    // ヒットエリア（透明）
    const hitArea = scene.add.rectangle(0, 0, info.width * per_length, info.height * per_length, 0xffffff, 0);
    hitArea.setOrigin(0);
    hitArea.setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => container.setAlpha(0.8));
    hitArea.on('pointerout', () => container.setAlpha(1));

    container.add(hitArea);

    return { container, hitArea };
}
