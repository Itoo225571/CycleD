import { gameConfig } from './config.js';
import { checkGameSize } from '../resize.js';

let game;

// 🎮 ゲーム初期化
window.onload = function() {
    game = new Phaser.Game(gameConfig);      // ゲームインスタンス作成
    window.focus();                          // ウィンドウにフォーカス（キー入力を確実に受けるため）
    // リサイズ監視
    checkGameSize(game);
}