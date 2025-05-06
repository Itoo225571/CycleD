import { createBtn } from './preload.js';

export default class GameoverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameoverScene' });
    }

    create() {
        // 半透明の黒背景を作成（画面全体を覆う）
        const { width, height } = this.scale;
        this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
            .setOrigin(0)
            .setDepth(0);  // 最背面に置く（ボタンより後ろ）

        // this.postScore();
        this.gameoverBtns = [];  
        const option = { centerX: true, fontFamily: '"Press Start 2P"' };
        var buttons = [
            { label: 'Re:start', callback: () => this.rePlayGame() },
            { label: 'Ranking', callback: () => this.goRankingScene() },
            { label: 'Exit', callback: () => this.goStartScreen() }
        ];
        buttons.forEach(({ label, callback }) => {
            const { container, hitArea } = createBtn(0, 0, this, label, option);
            container.setDepth(100);
            hitArea.on('pointerdown', () => {
                callback();
            });
            this.gameoverBtns.push({ container, hitArea });
        });
        var baseY = 300, spacing = 150;
        this.gameoverBtns.forEach((btn, index) => {
            btn.container.y = baseY + spacing * index;
        });

        // text
        this.stHeight = 100;
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
        this.newRecordText = this.add.text(
            -200,
            this.stHeight + this.gameOverText.height,       //左端から
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
        this.scoreText = this.add.text(
            this.cameras.main.centerX,
            -100,  // "Game Over" の下に配置
            '',  // とりあえず空
            {
                fontFamily: '"Press Start 2P"',
                fontSize: '32px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(100);
    }

    startAnim(is_newrecord = false) {
        // 上から落ちるアニメーション
        this.tweens.add({
            targets: this.gameOverText,
            y: this.stHeight,
            ease: 'Bounce.easeOut',  // バウンド効果
            duration: 700,  // 落ちる時間
            repeat: 0  // 繰り返しなし
        });
        if (is_newrecord) {
            // New Record
            this.tweens.add({
                targets: this.newRecordText,
                x: this.cameras.main.centerX, // 中央までスライド
                ease: 'Power2', // スムーズな加速＆減速
                duration: 700, // 移動
                delay: 1000,    //1秒後に実行
            });
            // 点滅アニメーションを追加
            this.tweens.add({
                targets: this.newRecordText,
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
        this.scoreText.setText(scoreDisplay);
        // スコアのアニメーション
        this.tweens.add({
            targets: this.scoreText,
            y: this.stHeight + this.gameOverText.height + 60,   // Game Overのテキスト下に配置
            ease: 'Bounce.easeOut',
            duration: 1000,
            repeat: 0
        });
    
    }

    postScore() {
        var id = score_id;
        
        var is_newrecord = false;
        $.ajax({
            url: `/games/api/score_nikirun/${id}/`,
            method: 'PATCH',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            data: {
                score: this.score,  // 更新したいデータ
            },
            success: (response) => {
                is_newrecord = Boolean(response.is_newrecord)
            },
            error: function(xhr, status, error) {
                var response = xhr.responseJSON;
            
                // response.formが存在するか確認
                if (response && response.form && response.form.fields) {
                    var errors = response.form.fields;
                    $.each(errors, function(_, error) {
                        // 手動でエラーを出力
                        append_error_ajax(error.label, error.errors);
                    });
                } else {
                    // response.formが存在しない場合のエラーハンドリング（必要に応じて）
                    console.error("Error response structure is invalid or missing fields.");
                }
            },            
            complete: () => {
                this.startAnim(is_newrecord);  // 成功・失敗に関わらず呼び出す
            },
        }); 
    }

    rePlayGame() {
        // 現在のプレイシーンを完全に停止して初期化
        this.scene.stop('PlayScene');
        // 自身も停止
        this.scene.stop();
        // PlayScene を最初から再スタート
        this.scene.start('PlayScene');
    }
    
    // 「Start画面」に戻る処理
    goStartScreen() {
        this.scene.stop('PlayScene');
        this.scene.start('StartScene');
        this.scene.stop();  // 現在のシーンを停止
    }

    goRankingScene() {
        this.scene.get('RankingScene').data.set('previousScene', 'GameoverScene');
        this.gameOverText.setVisible(false);  //titleを隠す
        if (!this.scene.isActive('RankingScene')) {
            // 起動していなければ、RankingSceneをオーバーレイとして開始
            this.scene.launch('RankingScene');
        }
        const RankingScene = this.scene.get('RankingScene');
        RankingScene.onBringToTop?.();
        this.scene.bringToTop('RankingScene');
    }

    onBringToTop(post_score = false) {
        this.gameoverBtns?.forEach(btn => btn.container.setVisible(true));
        this.overlay?.setVisible(true);
        this.gameOverText?.setVisible(true);
    
        if (post_score) {
            this.score = this.scene.get('PlayScene').score;
            this.postScore();
        }
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