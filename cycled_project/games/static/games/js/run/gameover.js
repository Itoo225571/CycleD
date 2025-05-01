import { createBtn } from './preload.js';

export default class GameoverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameoverScene' });
    }

    create() {
        this.postScore();
    }

    GameOver(is_newrecord = false) {
        var stHeight = 100;
        const gameOverText = this.add.text(
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
            targets: gameOverText,
            y: stHeight,
            ease: 'Bounce.easeOut',  // バウンド効果
            duration: 700,  // 落ちる時間
            repeat: 0  // 繰り返しなし
        });
        if (is_newrecord) {
            const newRecordText = this.add.text(
                -200,
                stHeight + gameOverText.height,
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
            y: stHeight + gameOverText.height + 60,   // Game Overのテキスト下に配置
            ease: 'Bounce.easeOut',
            duration: 1000,
            repeat: 0
        });
    
        this.pauseGame(this.gameoverBtns);
        this.is_gameover = true;    // pauseの後にtrueにする
    }

    postScore() {
        var id = score_id;
        var score = this.scene.get('GameoverScene').data.get('score') || 'score';
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
}

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