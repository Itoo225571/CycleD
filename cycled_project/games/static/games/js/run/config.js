import PreloadScene from './preload.js';
import PlayScene from './play.js';
import StartScene from './start.js';
import RankingScene from './ranking.js';

export const gameOptions = {
    playerStartSpeed: 350,
    playerAccel: 60,
    // spawnRange: [100, 350],
    // platformSizeRange: [50, 250],
    playerGravity: 1500,
    jumpForce: 800,
    playerStartPosition: 200,
    // playerStartPosition: 600,
    jumps: 2,
    oneBlockSize: 64,
    lives: 2,
    tileName: 'Tiles1',
    startChunk: 'startMap',
    // startChunk: 'flatMap',
    chunks: ['flatMap'],
};

export const gameConfig = {
    type: Phaser.AUTO,
    width: 1334,
    height: 750,
    pixelArt: true,
    scene: [PreloadScene, StartScene, PlayScene, RankingScene], // シーンの順番
    backgroundColor: 0x444444,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            // debug: true
        }
    },
    plugins: {
        scene: [
            {
                key: 'rexUI',
                plugin: window.rexuiplugin,   // ここそのままでOK！
                mapping: 'rexUI'
            }
        ]
    },
};
