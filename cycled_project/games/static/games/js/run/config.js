import PreloadScene from './preload.js';
import PlayScene from './play.js';
import StartScene from './start.js';
import RankingScene from './ranking.js';
import PauseScene from './pause.js'

export const gameOptions = {
    playerStartSpeed: 5,
    // playerStartSpeed: 15,
    playerAccel: 1,
    jumpForce: 20,
    garavityForce: 3,
    playerStartPosition: 200,
    jumps: 2,
    oneBlockSize: 64,
    lives: 2,
    startChunk: 'startMap',
    chunks: ['Map1','Map2'],
    // chunks: ['startMap'],
    tilesets: [
        { nameInTiled: 'Tiles1', textureKey: 'Tiles1' },
    ]
};

export const gameConfig = {
    type: Phaser.AUTO,
    width: 1334,
    height: 750,
    pixelArt: true,
    scene: [PreloadScene, StartScene, PlayScene, RankingScene, PauseScene], // シーンの順番
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
    PLAYER: 0x0001,
    ENEMY:  0x0002,
    ITEM:   0x0004,
    WALL:   0x0008,
};