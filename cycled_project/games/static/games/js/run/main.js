import { gameConfig } from './config.js';
import { resize } from '../resize.js';

let game;

// 🎮 ゲーム初期化
window.onload = function() {
    WebFont.load({
        google: {
          families: ['JF-Dot-K14','Press Start 2P']
        },
        custom: {
            families: ['JF-Dot-K14','DTM-Sans'],
            urls: ['/static/games/css/run.css']  // ← CSSファイルのパスを指定する
        },
        active: function () {
            game = new Phaser.Game(gameConfig);      // ゲームインスタンス作成
            window.focus();                          // ウィンドウにフォーカス（キー入力を確実に受けるため）
            // リサイズ監視
            // resize(game);
        }
    });
};
