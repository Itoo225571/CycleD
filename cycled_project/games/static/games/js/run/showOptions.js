import { createPopupWindow } from "./drawWindow.js";
import { update_options, get_options, optionsMeta } from "./config.js";

function createVolumeSlider(scene, popup, x, y, width, height, steps, initialValue, onValueChange) {
    // track（見た目）
    const track = scene.add.rectangle(0, 0, width, height, 0xaaaaaa).setDepth(0);
    const thumb = scene.add.circle(0, 0, height, 0xffffff).setInteractive({
        useHandCursor: true  // ← これを追加
    }).setDepth(1);

    // 背景模様をGraphicsで作成
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x888888, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(2, 0xffffff, 1);
    for (let i = 0; i <= steps; i++) {
        const xLine = height + ((width - height * 2) / steps) * i;
        graphics.beginPath();
        graphics.moveTo(xLine, 0);
        graphics.lineTo(xLine, height);
        graphics.strokePath();
    }
    const textureKey = `sliderBackgroundPattern_${width}x${height}`;
    graphics.generateTexture(textureKey, width, height);
    graphics.destroy();
    const bgImage = scene.add.image(0, 0, textureKey).setOrigin(0, 0);

    const slider = scene.rexUI.add.slider({
        x: x,
        y: y,
        width: width,
        height: height,
        orientation: 'x',
        background: bgImage,
        track: track,
        thumb: thumb,
        value: initialValue,
        valuechangeCallback: (value) => {
            onValueChange(value);
        }
    })
    .layout()
    .setGap(1 / steps);

    // track クリックで値を変えるイベント
    track.setInteractive({
        useHandCursor: true  // ← これを追加
    }).on('pointerdown', (pointer) => {
        const worldLeft = slider.getTopLeft().x;
        const worldX = pointer.x - popup.container.x;
        const localX = worldX - worldLeft;
        const newValue = Math.round((localX / width) * steps) / steps;
        slider.setValue(newValue);
    });

    return slider;
}

function createToggle(scene, x, y, fontSize, initialValue, onToggle) {
    // シンプルなトグルの例（クリックでON/OFF切り替え）
    const text = scene.add.text(x, y, initialValue ? 'ON' : 'OFF', { 
        fontFamily: 'DTM-Sans',
        fontSize: `${fontSize}px`, 
        color: '#fff'  
    }).setInteractive({
        useHandCursor: true  // ← これを追加
    });
    text.on('pointerdown', () => {
        const newValue = !text.text === 'ON';
        text.setText(newValue ? 'ON' : 'OFF');
        onToggle(newValue);
    });
    return text;
}

export function showOptions(scene) {
    const options = get_options();

    const popup = createPopupWindow(scene, {
        x: scene.game.config.width / 2,
        y: scene.game.config.height / 2,
        width: scene.game.config.height * 4 / 5 * 1.618,
        height: scene.game.config.height * 4 / 5,
        header: 'おぷしょん',
        message: '',
        // onOK: () => { console.log('OK'); },
    });

    const sliderWidth = popup.container.width /2;
    const sliderHeight = 20;
    const steps = 10;
    const paddingY = 100;  // スライダー間の縦スペース
    const fontSize = 48;

    // popup.containerの初期配置座標
    let baseX = -400;
    let baseY = -150;

    // オプションのキー順にスライダーを作成
    Object.entries(options).forEach(([key, value], index) => {
        const meta = optionsMeta[key];
        if (!meta)  return; // 存在しなかったらスキップ
        // ラベル作成
        const label = scene.add.text(baseX, baseY + paddingY*index , meta.label, { 
            fontFamily: 'JF-Dot-K14',
            fontSize: `${fontSize}px`, 
            color: '#fff' 
        });
        popup.container.add(label);

        let content;
        if (meta.type === 'slider') {
            // スライダー作成
            content = createVolumeSlider(
                scene,
                popup,
                popup.container.width/4 - 60,           // POPUP右端より少し左
                baseY + paddingY*index + fontSize/2,
                sliderWidth,
                sliderHeight,
                steps,
                value,
                (newValue) => {
                    options[key] = newValue;
                    update_options(scene, options);
                }
            );
        } else if (meta.type === 'toggle') {
            content = createToggle(
                scene,
                popup.container.width/4 - fontSize/2 -60,
                baseY + paddingY*index,
                fontSize,
                options[key],
                (value) => {
                    options[key] = value;
                    update_options(scene, options);
                }
            );
        }
        popup.container.add(content);
    });
}
