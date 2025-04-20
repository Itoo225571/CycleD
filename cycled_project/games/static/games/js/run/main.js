import TitleScene from './title.js';
import RunScene from './run.js';

$(document).ready(function() {
    const $container = $('#game-container');
    const width = $container.width();
    const height = $container.height();

    const config = {
        type: Phaser.AUTO,
        width: width,
        height: height,
        parent: 'game-container',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 500 },
                debug: false
            }
        },
        scene: [TitleScene, RunScene],
        backgroundColor: 0x87ceeb
    };

    const game = new Phaser.Game(config);
    checkGame(game);
});
