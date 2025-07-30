export function createFrame(scene, widthInTiles, heightInTiles, imgKey, borderColor = 0xffffff, alpha = 1) {
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

    frame.setTint(borderColor);
    frame.setAlpha(alpha);

    return frame;
}

export function createMsgWindow(scene, message = '', delay = 0, option={}) {
    const info = {
        x: option.x || 0,
        y: option.y || 500,
        width: option.width || 75,
        height: option.height || 15,
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

    var tileName = option.transparent? 'msgWindowTileTransparent': 'msgWindowTile';
    const frame = createFrame(scene, widthInTiles, heightInTiles, tileName, 0x000000, 0.5);
    container.add(frame);  // コンテナに追加

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

    return container
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
        btnSound: option.button ? option.button.sound || 'buttonHardSound' : 'buttonHardSound',
    };

    // 中央配置処理
    const gameWidth = scene.scale.width;
    const gameHeight = scene.scale.height;

    const posX = option.centerX ? (gameWidth - info.btnWidth * per_length) / 2 : x;
    const posY = option.centerY ? (gameHeight - info.btnHeight * per_length) / 2 : y;

    const container = scene.add.container(posX, posY);

    const tileName = option.button && option.button.transparent ? 'btnTileTransparent' : 'btnTile';
    const frame = createFrame(scene, info.btnWidth, info.btnHeight, tileName, info.btnColor);
    container.add(frame);  // コンテナに追加

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
        var fontSize = option.fontSize || info.contentWidth;
        const text = scene.add.text(
            (info.btnWidth * per_length) / 2,
            (info.btnHeight * per_length) / 2,
            content,
            {
                fontFamily: option.fontFamily || 'JF-Dot-K14',
                fontSize: `${fontSize}px`,
                color: cssColor,
            }
        ).setOrigin(0.5)
        .setShadow(2, 2, '#555555', 0, true, true);  // ← ここで影を追加;
        container.add(text);
    }

    // 効果音
    const sfxManager = scene.sfxManager;

    // ヒットエリア（透明）
    const buttonColor = info.btnColor;
    const hitArea = scene.add.rectangle(0, 0, info.btnWidth * per_length, info.btnHeight * per_length, buttonColor, 0);
    hitArea.setOrigin(0);
    hitArea.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            sfxManager.play(info.btnSound)
        });

    hitArea.on('pointerover', () => container.setAlpha(0.3));
    hitArea.on('pointerout', () => container.setAlpha(1));

    container.add(hitArea);

    return { container, hitArea };
}

export function createPopupWindow(scene, option) {
    // 効果音
    const sfxManager = scene.sfxManager;

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
        state.queue.push(option);
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
        // transparent = false,
        showCoin = false,
        coinCount = 0,
        closeOnOutsideClick= true,  // デフォルト true
        outsideClickAsCancel= true, // デフォルト true

    } = option;

    const container = scene.add.container(x, y);

    // const tileName = transparent? 'msgWindowTileTransparent': 'msgWindowTile';
    const tileName = 'msgWindowTileBorder';
    // 黒い背景をまず描く
    const bgRect = scene.add.rectangle(0, 0, width, height, 0x000000, 1)
        .setOrigin(0.5)
        .setInteractive();  //クリック無効
    container.add(bgRect);
    // 白いボーダーのみを持つ ninePatch を重ねる
    const frame = scene.rexUI.add.ninePatch2({
        x: 0,
        y: 0,
        width,
        height,
        key: tileName,
        columns: [16, undefined, 16],
        rows: [16, undefined, 16]
    })
        .setOrigin(0.5)
        .setInteractive();  // クリック無効
    container.add(frame);

    const headerText = scene.rexUI.add.BBCodeText(0, -height / 2 + 48, header, {
        fontSize: '48px',
        fontFamily: 'JF-Dot-K14',
        color: '#FFFFFF',  // ← 白
        wordWrap: { width: width - 40 },
        align: 'center',
    }).setOrigin(0.5);
    container.add(headerText);

    const messageText = scene.rexUI.add.BBCodeText(0, -height / 2 + 48 * 2 + 16, message, {
        fontFamily: 'JF-Dot-K14',
        fontSize: '32px',
        color: '#FFFFFF',  // ← 白
        wordWrap: { width: width - 40 },
        align: 'left',
        lineSpacing: 16
    }).setOrigin(0, 0);
    container.add(messageText);
    messageText.setX(-width / 2 + 32);

    var btnHeight = height / 2 - 64 - 16;
    const okButton = createButton(scene, okText, () => {
        sfxManager.play('buttonSoftSound')
        onOK();
        closePopup();
    }, showCancel ? -130 : 0, btnHeight, 'white');
    container.add(okButton);

    let cancelButton = null;
    if (showCancel) {
        cancelButton = createButton(scene, cancelText, () => {
            sfxManager.play('buttonHardSound');
            onCancel();
            closePopup();
        }, 130, btnHeight, 'white');
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
    if (closeOnOutsideClick !== false) {
        blocker.on('pointerdown', () => {
            sfxManager.play('buttonHardSound');
            if (outsideClickAsCancel !== false && showCancel) {
                onCancel();
            } else {
                onOK();
            }
            closePopup();
        });
    }
    

    // Coin 追加
    if (showCoin) {
        const animKey = 'coin_gold';
    
        // テキスト一時作成して幅取得（正確な中央揃えのため）
        const tmpText = scene.add.text(0, 0, `${coinCount}`, {
            fontSize: '48px',
            fontFamily: 'DTM-Sans'
        }).setVisible(false);
    
        const textWidth = tmpText.width;
        tmpText.destroy(); // 不要になったので破棄
    
        const spacing = 10; // アイコンとテキストの間隔
        const iconWidth = 64;
        const totalWidth = iconWidth + spacing + textWidth;
    
        // アニメーションスプライト（左寄せに配置）
        const animSprite = scene.add.sprite(-totalWidth / 2 + iconWidth / 2, 0, animKey)
            .play(animKey)
            .setOrigin(0.5)
            .setDisplaySize(iconWidth, iconWidth);
    
        // テキスト（アニメの右横に）
        const coinText = scene.add.text(animSprite.x + iconWidth / 2 + spacing, 0, `${coinCount}`, {
            fontSize: '48px',
            color: '#FFFFFF',
            fontFamily: 'DTM-Sans'
        }).setOrigin(0, 0.5); // 左寄せ・中央垂直
    
        // 中央配置のコンテナ（ポップアップ中央に置く）
        const coinDisplay = scene.add.container(0, 0, [animSprite, coinText]);
        container.add(coinDisplay);
    }
    

    return {
        container,
        okButton,
        cancelButton
    };

    function createButton(scene, label, callback, posX, posY, color) {
        const buttonWidth = 200;
        const buttonHeight = 70;

        // const bg = scene.rexUI.add.ninePatch2({
        //     width: buttonWidth,
        //     height: buttonHeight,
        //     key: 'btnTile',
        //     columns: [16, undefined, 16],
        //     rows: [16, undefined, 16]
        // }).setOrigin(0.5).setTint(0x808080);

        const text = scene.add.text(0, 0, label, {
            fontSize: '64px',
            color: color,
            fontFamily: 'DTM-Sans',
        }).setOrigin(0.5);

        // const container = scene.add.container(posX, posY, [bg, text]);
        const container = scene.add.container(posX, posY, [text]);
        container.setSize(buttonWidth, buttonHeight);
        container.setInteractive({ useHandCursor: true })
            .on('pointerdown', callback);
        container.on('pointerover', () => container.setAlpha(0.3));
        container.on('pointerout', () => container.setAlpha(1));

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
