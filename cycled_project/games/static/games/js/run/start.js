export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        this.titleReady = false;  // ← アニメーション完了フラグ

        var TITLE_NAME = 'NIKI RUN';
        // フェードインしつつ、ゆっくり上下に浮かぶ
        this.title = this.add.text(
            -200, 150, // 画面の左外側から開始
            TITLE_NAME, {
                fontFamily: '"Press Start 2P"',
                fontSize: '60px',
                color: '#ffffff',
                resolution: 2
            }).setOrigin(0.5).setAlpha(0).setScale(0.9)
            .setShadow(10, 10, '#660066', 0, true, true);  // ← 影を追加！;
        // アニメーション
        this.tweens.add({
            targets: this.title,
            x: this.scale.width / 2, // 画面の中央に移動
            alpha: 1,
            scale: 1,
            duration: 500,
            ease: 'Back.Out',
            onComplete: () => {
                this.titleReady = true;  // ← アニメ完了フラグ立てる
                this.tweens.add({
                    targets: this.title,
                    y: this.title.y - 20,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    delay: 500,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        

        // var msgs = [
        //     'NAME: ponny',
        //     '3日に1度はパンツの前後ろを間違え、5日に1度はパンツの表裏を間違える。'
        // ]
        // createMsgWindow(this,msgs,0)

        var option = { centerX: true, fontFamily: '"Press Start 2P"' };
        var btnList = [
            { y: 300, label: 'Start', callBack: this.goPlayScene.bind(this) },
            { y: 430, label: 'Select Character', callBack: this.goCharaSelectScene.bind(this) },
            { y: 560, label: 'Ranking', callBack: this.goRankingScene.bind(this) }
        ];        
        
        btnList.forEach((btn) => {
            // btn.y と btn.label を使う
            let { container, hitArea } = createBtn(0, btn.y, this, btn.label, option);
        
            // 初期状態で透明にする
            container.setAlpha(0);
        
            // 順番にフェードインさせる（100msずつ遅らせて）
            this.tweens.add({
                targets: container,
                alpha: 1,
                duration: 400,
                delay: 500,  // 開始500ms後から順に
                ease: 'Power1',
                onComplete: () => {
                    // フェードインが完了した後に hitArea にイベントをバインド
                    hitArea.setInteractive({ useHandCursor: true });
                    hitArea.on('pointerdown', btn.callBack);
                }
            });
        });
        

        // background
        this.add.image(0, 0, 'sky')
            .setOrigin(0, 0)
            .setDisplaySize(this.game.config.width, this.game.config.height)
            .setDepth(-7);

        // rankingSceneが起動中だったら停止する
        if (this.scene.isActive('RankingScene')) this.scene.stop('RankingScene');
    }

    goPlayScene() {
        this.scene.start('PlayScene');
    }
    goCharaSelectScene() {
        this.scene.start('SelectCharacterScene');
    }
    goRankingScene() {
        if (!this.titleReady) return;  // ← ここで弾く！

        this.scene.get('RankingScene').data.set('previousScene', 'StartScene');
        this.title.setVisible(false);  //titleを隠す
        if (!this.scene.isActive('RankingScene')) {
            this.scene.launch('RankingScene');
        }
        const RankingScene = this.scene.get('RankingScene');
        RankingScene.onBringToTop?.();
        this.scene.bringToTop('RankingScene');
    }
    onBringToTop() {
        this.title.setVisible(true);  //titleを見せる
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
            fontFamily: 'DotGothic16',
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
