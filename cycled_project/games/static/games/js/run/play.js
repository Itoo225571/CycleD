import { gameOptions } from './config.js';
import { createBtn } from './preload.js';
import Player from './class/Player.js';
import MapManager from './class/MapManager.js';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super("PlayScene");
    }

    create() {
        this.elapsedTime = 0;
        this.isPaused = false;
        this.score = 0;

        const config = {
            // speed: 10,
            // accel: 2,
            jumps: 2,
            lives: 2,
        };
        this.player = new Player(this, 'NinjaFrog', config);

        this.input.on("pointerdown", this.player.jump.bind(this.player), this);
        this.input.keyboard.on('keydown-SPACE', this.player.jump.bind(this.player), this);

        var tilesets = gameOptions.tilesets;
        this.mapManager = new MapManager(this, tilesets);
        this.mapManager.addNextChunk();

        // カメラが追いかける中心点
        this.centerPoint = this.matter.add.sprite(this.scale.width / 2, this.scale.height / 2, null);
        this.centerPoint.setVisible(false);
        this.centerPoint.setIgnoreGravity(true);
        this.cameras.main.startFollow(this.centerPoint, false, 1, 0);
        this.centerPoint.body.isSensor = true;

        if (this.scene.isActive('RankingScene')) this.scene.stop('RankingScene'); 
    }

    update(time, delta) {
        if (this.isPaused) return;

        let cam = this.cameras.main;
        this.elapsedTime += delta;

        this.player.update(this.elapsedTime, cam);
        this.centerPoint.setVelocityX(this.player.speed);

        const guideX = this.mapManager.nextChunkX - this.mapManager.chunkWidth / 2;
        if (this.player.x > guideX) {
            this.mapManager.addNextChunk();
        }
        this.mapManager.updateEnemies();

        const leftBound = cam.scrollX - (cam.width / 6);
        const bottomBound = cam.scrollY + cam.height * 7 / 6;
        const outOfBounds = this.player.x < leftBound || this.player.y > bottomBound;

        if (outOfBounds) {
            this.loseLife();
        }

    }

    loseLife() {
        const is_alive = this.player.loseLife();
        if (is_alive) {
            this.respawnPlayer();
        } else {
            this.scene.start('StartScene');
        }
    }

    respawnPlayer() {
        this.isPaused = true;
        this.cameras.main.stopFollow();

        this.player.setVisible(false);
        this.player.setActive(false);
        this.player.setStatic(true); // Matter.jsでは無効化の代替

        this.input.enabled = false;
        this.matter.world.pause();

        const totalDelay = 1000;

        this.time.delayedCall(totalDelay, () => {
            this.player.setPosition(
                gameOptions.playerStartPosition,
                this.game.config.height / 2
            );
            this.player.setStatic(false);
            this.player.setActive(true);
            this.player.setVisible(true);

            this.mapManager.resetMap([this.player.body,this.centerPoint.body]);
            this.mapManager.addNextChunk();

            this.centerPoint.setPosition(this.scale.width / 2, this.scale.height / 2);
            this.cameras.main.startFollow(this.centerPoint, false, 1, 0);

            this.isPaused = false;
            this.input.enabled = true;
            this.matter.world.resume();
        });
    }
    rePlayGame() {
        this.scene.restart();
    }

    GameOver(is_newrecord = false) {
        var stHeight = 100;
        this.gameOverText = this.add.text(
            this.cameras.main.centerX,
            -100,  // 画面の上外からスタート
            'Game Over',
            {
                fontFamily: '"Press Start 2P"',
                fontSize: '64px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(100);
        // 上から落ちるアニメーション
        this.tweens.add({
            targets: this.gameOverText,
            y: stHeight,
            ease: 'Bounce.easeOut',  // バウンド効果
            duration: 700,  // 落ちる時間
            repeat: 0  // 繰り返しなし
        });
        if (is_newrecord) {
            const newRecordText = this.add.text(
                -200,
                stHeight + this.gameOverText.height,
                'NEW RECORD!',
                {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '24px',
                    color: '#FFD700',   // 金色っぽい
                    stroke: '#FF0000',  // 赤い縁取り
                    strokeThickness: 8, // 縁取りの太さ
                    shadow: {
                        offsetX: 4,
                        offsetY: 4,
                        color: '#000000',
                        blur: 4,
                        fill: true
                    }
                }
            ).setOrigin(0.5).setDepth(100);
            // New Record
            this.tweens.add({
                targets: newRecordText,
                x: this.cameras.main.centerX, // 中央までスライド
                ease: 'Power2', // スムーズな加速＆減速
                duration: 700, // 移動
                delay: 1000,    //1秒後に実行
            });
            // 点滅アニメーションを追加
            this.tweens.add({
                targets: newRecordText,
                alpha: { from: 1, to: 0 }, // 透明度を1から0に変更
                yoyo: true,                // アニメーションが終わったら元に戻る
                repeat: -1,                // 永遠に繰り返す
                duration: 500,             // 500msでフェードイン・フェードアウト
                ease: 'Sine.inOut',        // スムーズに点滅
                delay: 2000,
            });
        }

        // スコアを表示するテキスト
        var scoreDisplay = strScore(this.score);
        const scoreText = this.add.text(
            this.cameras.main.centerX,
            -100,  // "Game Over" の下に配置
            scoreDisplay,  // 実際のスコア値を表示
            {
                fontFamily: '"Press Start 2P"',
                fontSize: '32px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(100);
        // スコアのアニメーション
        this.tweens.add({
            targets: scoreText,
            y: stHeight + this.gameOverText.height + 60,   // Game Overのテキスト下に配置
            ease: 'Bounce.easeOut',
            duration: 1000,
            repeat: 0
        });
    
        this.pauseGame(this.gameoverBtns);
        this.is_gameover = true;    // pauseの後にtrueにする
    }
    

    handleBlur() {
        this.pauseGame(this.resumeBtns);
    }

    handleFocus() {
        // 自前でポーズしていなかったら
        if (!this.selfPased) {
            this.resumeGame();
        }
    }

    postScore() {
        var id = score_id;
        var score = this.score;
        var is_newrecord = false;
        $.ajax({
            url: `/games/api/score_nikirun/${id}/`,
            method: 'PATCH',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            data: {
                score: score,  // 更新したいデータ
            },
            success: (response) => {
                is_newrecord = Boolean(response.is_newrecord)
                this.GameOver(is_newrecord);
            },
            error: function(xhr, status, error) {
                var response = xhr.responseJSON;
                var errors = response.form.fields;
                $.each(errors,function(_,error) {
                    // 手動でエラーを出力
                    append_error_ajax(error.label,error.errors);
                })
                this.GameOver(is_newrecord);
            },
        }); 
    }

    goRankingScene() {
        // this.preScene = 'PlayScene';
        this.scene.get('RankingScene').data.set('previousScene', 'PlayScene');

        if (this.scene.isActive('RankingScene')) {
            // すでに起動している場合はbringToTopで最前面に移動
            this.scene.bringToTop('RankingScene');
        } else {
            // 起動していなければ、RankingSceneをオーバーレイとして開始
            this.scene.launch('RankingScene');
        }
        this.gameOverText.setAlpha(0);  //titleを隠す
    }
    preBackScene() {
        this.gameOverText.setAlpha(1);  //titleを見せる
    }

    // シーン終了時にイベントリスナーを削除
    shutdown() {
        if (this.game) {
            this.game.events.removeListener(Phaser.Core.Events.BLUR, this.handleBlur, this);
            this.game.events.removeListener(Phaser.Core.Events.FOCUS, this.handleFocus, this);
        }
    }
};

function strScore(score) {
    let scoreDisplay;
    if (score > 1000000) {
        scoreDisplay = (score / 1000).toFixed(0) + ' km';
    } else if (score > 1000) {
        scoreDisplay = (score / 1000).toPrecision(3) + ' km';
    } else {
        scoreDisplay = score.toPrecision(3) + ' m';
    }
    return scoreDisplay;
}