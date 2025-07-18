import PreloadScene from './preload.js';
import PlayScene from './play.js';
import StartScene from './start.js';
import RankingScene from './ranking.js';
import PauseScene from './pause.js'
import GameoverScene from './gameover.js';
import SelectCharacterScene from './select_character.js';
import PreStartScene from './prestart.js';

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
    ]
};

export const gameConfig = {
    type: Phaser.AUTO,
    width: 1334,
    height: 750,
    pixelArt: true,
    scene: [
        PreloadScene, 
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
