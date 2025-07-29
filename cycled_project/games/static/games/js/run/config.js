import PreloadScene from './scene/preload.js';
import PlayScene from './scene/play.js';
import StartScene from './scene/start.js';
import RankingScene from './scene/ranking.js';
import PauseScene from './scene/pause.js'
import GameoverScene from './scene/gameover.js';
import SelectCharacterScene from './scene/select_character.js';
import PreStartScene from './scene/prestart.js';
import OptionsScene from './scene/options.js';

export const gameOptions = {
    garavityForce: 3,
    playerStartPosition: 200,
    oneBlockSize: 64,
    startChunk: 'startMap',
    chunks: ['Map1','Map2','Map3','Map4','Map5','Map6'],
    // chunks: ['Map6'],
    maxSpeed: 10,   // 暫定最大速度
    tilesets: [
        { nameInTiled: 'Tiles1', textureKey: 'Tiles1' },
    ],
};

export const gameConfig = {
    type: Phaser.AUTO,
    width: 1334,
    height: 750,
    pixelArt: true,
    scene: [
        PreloadScene, OptionsScene,
        PreStartScene, StartScene, PlayScene, RankingScene, SelectCharacterScene,
        PauseScene , GameoverScene, 
    ], // シーンの順番
    backgroundColor: 0x444444,
    parent: 'game-container',
    physics: {
        default: 'matter',
        matter: {
            enableSleeping: true,
            debug: {
                showBody: true,
                showStaticBody: true
            },
            gravity: {
                y: gameOptions.garavityForce,
            },
            enableSleep: true,
            debug: false,
        }
    },
    plugins: {
        scene: [
            {
                key: 'rexUI',
                plugin: window.rexuiplugin,   // ここそのままでOK！
                mapping: 'rexUI'
            },
            {
                key: 'matterCollision',
                plugin: window.PhaserMatterCollisionPlugin.default,
                mapping: 'matterCollision'
            },
            {
                key: 'PhaserRaycaster',
                plugin: window.PhaserRaycaster,
                mapping: 'raycasterPlugin'
            }
        ]
    },
};

export const CATEGORY = {
    PLAYER:     0x0001,
    ENEMY:      0x0002,
    ITEM:       0x0004,
    WALL:       0x0008,
    TRAP:       0x0010, // 追加
    CEILING:    0x0012, // 天井
};

const STORAGE_KEY_OPTIONS = 'gameNIKIRunOptions';
const defaultOptions = {
    masterVolume: 1.0,
    bgmVolume: 1.0,
    sfxVolume: 1.0,
    // fullscreen: false,
};
export const optionsMeta = {
    masterVolume: { type: 'slider', label: '主音量', min: 0, max: 1, steps: 10 },
    bgmVolume: { type: 'slider', label: 'ＢＧＭ', min: 0, max: 1, steps: 10 },
    sfxVolume: { type: 'slider', label: '効果音', min: 0, max: 1, steps: 10 },
    // fullscreen: { type: 'toggle', label: 'フルスクリーン' },
};

export function get_options() {
    const stored = localStorage.getItem(STORAGE_KEY_OPTIONS);

    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.warn('設定の読み込みに失敗しました。デフォルト値を使用します。', e);
        }
    }

    // 保存されていなかった or パース失敗時 → デフォルト値を保存して返す
    localStorage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(defaultOptions));
    return defaultOptions;
}
export function update_options(scene, newValues) {
    const validKeys = Object.keys(defaultOptions);

    // 不正なキーを除外
    const filtered = Object.fromEntries(
        Object.entries(newValues).filter(([key]) => validKeys.includes(key))
    );

    const stored = localStorage.getItem(STORAGE_KEY_OPTIONS);
    let currentOptions;

    try {
        currentOptions = stored ? JSON.parse(stored) : defaultOptions;
    } catch (e) {
        console.warn('オプションの読み込みに失敗したため、初期値を使用します。', e);
        currentOptions = defaultOptions;
    }

    const updatedOptions = { ...currentOptions, ...filtered };
    localStorage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(updatedOptions));

    scene.bgmManager.updateVolume();

    return updatedOptions;
}