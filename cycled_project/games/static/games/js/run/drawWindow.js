function createFrame(scene, container, widthInTiles, heightInTiles, imgKey, color = null, alpha = 1) {
    const tileSize = 16;
    const width = widthInTiles * tileSize;
    const height = heightInTiles * tileSize;

    const frame = scene.rexUI.add.ninePatch2({
        x: 0,
        y: 0,
        width: width,
        height: height,
        key: imgKey,
        columns: [tileSize, undefined, tileSize],
        rows: [tileSize, undefined, tileSize],
    }).setOrigin(0);

    if (color) frame.setTint(color);
    frame.setAlpha(alpha);

    container.add(frame);
    return container;
}

export function createMsgWindow(scene, message = '', delay = 0, config={}) {
    const info = {
        x: config.x || 0,
        y: config.y || 500,
        width: config.width || 75,
        height: config.height || 15,
    };
    const per_length = 16;
    const widthInTiles = info.width;
    const heightInTiles = info.height;
    const windowWidth = widthInTiles * 16;

    if (scene._msgWindowContainer) {
        scene._msgWindowContainer.destroy(true);
        scene._msgWindowContainer = null;
    }

    if (scene._msgTypingEvent) {
        scene._msgTypingEvent.remove(false);
        scene._msgTypingEvent = null;
    }

    const container = scene.add.container((scene.scale.width - windowWidth) / 2, info.y);
    scene._msgWindowContainer = container;

    createFrame(scene, container, widthInTiles, heightInTiles, 'msgWindowTile', 0x000000, 0.5);

    const maxWidth = info.width * per_length - 16 * 5;

    const text = scene.rexUI.add.BBCodeText(
        per_length * 2,
        per_length * 2,
        '',
        {
            fontFamily: 'JF-Dot-K14',
            fontSize: '32px',
            wrap: { mode: 'word', width: maxWidth },
            lineSpacing: 16
        }
    );
    scene.add.existing(text); // 必要
    scene.winTextMsg = text;
    container.add(text);

    if (delay === 0) {
        text.setText(message);
    } else {
        // タグごとに分割
        const tagRegex = /\[.*?\]|./gs; // BBCodeタグまたは1文字
        const parts = message.match(tagRegex) || [];

        let index = 0;
        let displayText = '';

        scene._msgTypingEvent = scene.time.addEvent({
            delay: delay,
            loop: true,
            callback: () => {
                if (index < parts.length) {
                    displayText += parts[index];
                    text.setText(displayText);
                    index++;
                } else {
                    if (scene._msgTypingEvent) {
                        scene._msgTypingEvent.remove(false);
                        scene._msgTypingEvent = null;
                    }
                }
            }
        });
    }
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
                fontFamily: option.fontFamily || 'JF-Dot-K14',
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

export function createPopupWindow(scene, config) {
    // キューと状態の初期化（初回だけ）
    if (!scene.__popupState) {
        scene.__popupState = {
            active: false,
            queue: []
        };
    }

    const state = scene.__popupState;

    // すでにポップアップが表示中なら、キューに追加してリターン
    if (state.active) {
        state.queue.push(config);
        return;
    }

    // 今回のポップアップを「アクティブ」として表示
    state.active = true;

    const {
        x = 400,
        y = 300,
        width = 300,
        height = 150,
        header = '',
        message = '',
        showCancel = false,
        onOK = () => {},
        onCancel = () => {},
        okText = 'OK',
        cancelText = 'Cancel',
    } = config;

    const container = scene.add.container(x, y);

    const bg = scene.rexUI.add.ninePatch2({
        x: 0,
        y: 0,
        width,
        height,
        key: 'msgWindowTile',
        columns: [16, undefined, 16],
        rows: [16, undefined, 16]
    }).setOrigin(0.5);
    container.add(bg);

    const headerText = scene.rexUI.add.BBCodeText(0, -height / 2 + 48, header, {
        fontSize: '48px',
        fontFamily: 'JF-Dot-K14',
        color: '#000000',
        wordWrap: { width: width - 40 },
        align: 'center',
    }).setOrigin(0.5);
    container.add(headerText);

    const messageText = scene.rexUI.add.BBCodeText(0, -height / 2 + 48 * 2 + 16, message, {
        fontFamily: 'JF-Dot-K14',
        fontSize: '32px',
        color: '#000000',
        wordWrap: { width: width - 40 },
        align: 'left',
        lineSpacing: 16
    }).setOrigin(0, 0);
    container.add(messageText);
    messageText.setX(-width / 2 + 32);

    const okButton = createButton(scene, okText, () => {
        onOK();
        closePopup();
    }, showCancel ? -130 : 0, height / 2 - 48, 'white');
    container.add(okButton);

    let cancelButton = null;
    if (showCancel) {
        cancelButton = createButton(scene, cancelText, () => {
            onCancel();
            closePopup();
        }, 130, height / 2 - 48, 'white');
        container.add(cancelButton);
    }

    container.setSize(width, height);
    container.setDepth(1000);
    container.setScale(0);

    scene.tweens.add({
        targets: container,
        scale: 1,
        ease: 'Back.Out',
        duration: 400
    });

    const screenWidth = scene.sys.game.config.width;
    const screenHeight = scene.sys.game.config.height;
    const blocker = scene.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.3)
        .setOrigin(0)
        .setInteractive()
        .setDepth(999);

    return {
        container,
        okButton,
        cancelButton
    };

    function createButton(scene, label, callback, posX, posY, color) {
        const buttonWidth = 200;
        const buttonHeight = 70;

        const bg = scene.rexUI.add.ninePatch2({
            width: buttonWidth,
            height: buttonHeight,
            key: 'btnTile',
            columns: [16, undefined, 16],
            rows: [16, undefined, 16]
        }).setOrigin(0.5).setTint(0x808080);

        const text = scene.add.text(0, 0, label, {
            fontSize: '24px',
            color: color,
            fontFamily: 'JF-Dot-K14',
        }).setOrigin(0.5);

        const container = scene.add.container(posX, posY, [bg, text]);
        container.setSize(buttonWidth, buttonHeight);
        container.setInteractive({ useHandCursor: true })
            .on('pointerdown', callback);

        return container;
    }

    function closePopup() {
        scene.tweens.add({
            targets: container,
            scale: 0,
            alpha: 0,
            ease: 'Back.In',
            duration: 300,
            onComplete: () => {
                container.destroy();
                blocker.destroy();
                state.active = false;

                // 次のポップアップがあれば表示
                if (state.queue.length > 0) {
                    const nextConfig = state.queue.shift();
                    createPopupWindow(scene, nextConfig);
                }
            }
        });
    }
}
