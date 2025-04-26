import PreloadScene from './preload.js';
import PlayScene from './play.js';
import StartScene from './start.js';
import RankingScene from './ranking.js';

export const gameOptions = {
    platformStartSpeed: 350,
    spawnRange: [100, 350],
    platformSizeRange: [50, 250],
    playerGravity: 2400,
    jumpForce: 1000,
    playerStartPosition: 200,
    jumps: 2
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
};
