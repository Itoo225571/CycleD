import { createBtn, createPopupWindow } from './drawWindow.js';

export default class GameoverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameoverScene' });
        this.isReady = false;
    }

    create() {
        // PlayScene
        this.PlayScene = this.scene.get('PlayScene');
        // bgm
        this.bgmManager = this.registry.get('bgmManager');
        this.time.delayedCall(500, () => {
            this.bgmManager.play('bgmGameOver');
        }, [], this);

        // 半透明の黒背景を作成（画面全体を覆う）
        const { width, height } = this.scale;
        this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
            .setOrigin(0)
            .setDepth(0);  // 最背面に置く（ボタンより後ろ）

        // this.postScore();
        this.gameoverBtns = [];  
        const option = { centerX: true, fontFamily: 'DTM-Sans', fontSize: 64 };
        var buttons = [
            { label: 'Re: start', callback: () => this.rePlayGame() },
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
        this.stHeight = 80;
        this.gameOverText = this.add.text(
            this.cameras.main.centerX,
            -100,  // 画面の上外からスタート
            'Game Over',
            {
                fontFamily: 'DTM-Sans',
                fontSize: '96px',
                color: '#ffffff'
            }
        ).setOrigin(0.5);
        this.newRecordText = this.add.text(
            -200,   //左端から
            this.stHeight + this.gameOverText.height,
            'NEW RECORD!',
            {
                fontFamily: 'DTM-Sans',
                fontSize: '48px',
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
        ).setOrigin(0.5);
        this.scoreText = this.add.text(
            this.cameras.main.centerX,
            -100,  // "Game Over" の下に配置
            '',  // とりあえず空
            {
                fontFamily: 'DTM-Sans',
                fontSize: '48px',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        var scene = this.scene.get('PlayScene');
        this.postScore(scene);      // score投稿

        this.isReady = true;    // 準備完了
    }

    startAnim(score, is_newrecord = false) {
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
        var scoreDisplay = strScore(score);
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

    postScore(playScene) {
        // var id = score_id;
        const scoreData = this.registry.get('scoreData');   //前のデータ
        const id = scoreData.id;
        const chara_name = playScene.player.playerName;
        const score_new = playScene.score;
        
        // 新記録か，そもそも存在しない場合
        if (scoreData.score || scoreData.score < score_new) {
            var is_newrecord = false;
            var scene = this;
            $.ajax({
                url: `/games/api/nikirun_score/${id}/`,
                method: 'PATCH',
                headers: {
                    "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
                },
                data: {
                    score: score_new,  // 更新したいデータ
                    character: chara_name,
                },
                success: (response) => {
                    is_newrecord = Boolean(response.is_newrecord)   // サーバー側でも確認
                    this.registry.set('scoreData', response);   // 新しい情報をセット
                },
                error: function(xhr, status, error) {
                    let msg;
                    switch (xhr.status) {
                        case 400:
                            const res = xhr.responseJSON;
                            if (res && res.score) {
                                msg = 'スコアに関するエラー: ' + res.score.join(', ');
                            } else {
                                msg = 'リクエストに問題があります: ' + JSON.stringify(res);
                            }
                            break;
                        case 401:
                            msg = '認証が必要です。ログインしてください。';
                            break;
                        case 403:
                            msg = 'アクセスが拒否されました。権限がありません。';
                            break;
                        case 404:
                            msg = 'スコアデータが見つかりませんでした。';
                            break;
                        case 500:
                            msg = 'サーバー内部でエラーが発生しました。';
                            break;
                        default:
                            msg = `不明なエラーが発生しました\n（ステータスコード: ${xhr.status} ）`;
                    }
                    const popup = createPopupWindow(scene, {
                        x: scene.game.config.width / 2,  // 画面の中央X座標
                        y: scene.game.config.height / 2, // 画面の中央Y座標
                        width: scene.game.config.height * 2/3 * 1.618,
                        height: scene.game.config.height * 2/3,
                        header: 'Error',
                        message: msg ,
                    });
                },           
                complete: () => {
                    this.startAnim(score_new,is_newrecord);  // 成功・失敗に関わらず呼び出す
                },
            }); 
        } else {
            this.startAnim(score_new,false);  // newrecordじゃない場合，速攻でfalse
        }
    }

    rePlayGame() {
        // bgm停止
        this.bgmManager.stop();
        // 現在のプレイシーンを完全に停止して初期化
        this.scene.stop('PlayScene');
        // 自身も停止
        this.scene.stop();
        // PlayScene を最初から再スタート
        this.scene.start('PlayScene');
    }
    
    // 「Start画面」に戻る処理
    goStartScreen() {
        // bgm停止
        this.bgmManager.stop();
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
        if (!this.isReady)  return;

        // bgm
        this.time.delayedCall(500, () => {
            this.bgmManager.play('bgmGameOver');
        }, [], this);

        this.gameoverBtns?.forEach(btn => btn.container.setVisible(true));
        this.overlay?.setVisible(true);
        this.gameOverText?.setVisible(true);
        if (post_score) {
            var scene = this.scene.get('PlayScene');
            this.postScore(scene);
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