export default class RankingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RankingScene' });
    }

    create() {
        this.createBackBtn();
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setScrollFactor(0)
            .setDepth(-1);
        this.getScores();
        // this.showConfirmPopup();
    }

    goBackScene() {
        // previousSceneを取得
        const previousSceneKey = this.scene.get('RankingScene').data.get('previousScene') || 'StartScene';
        // シーンがアクティブか確認し、関数を呼び出す
        const previousScene = this.scene.get(previousSceneKey);
    
        if (previousScene) {
            // シーンがアクティブでない場合、再起動する
            if (!this.scene.isActive(previousSceneKey)) {
                this.scene.start(previousSceneKey);  // シーンを再起動
            }
            if (previousScene.preBackScene) {
                previousScene.preBackScene();   //戻る前に実行したい関数があれば実行
            }
        }
        this.scene.bringToTop(previousSceneKey);
    }
    
    getScores() {
        $.ajax({
            url: '/games/api/score_nikirun/',
            method: 'GET',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            success: (scores) => {
                // => を使えば，外側のthisをそのまま使える
                // スコアをランキングに表示する処理
                this.displayScores(scores);
            },
            error: function(xhr, status, error) {
                var response = xhr.responseJSON;
                var errors = response.form.fields;
                $.each(errors,function(_,error) {
                    // 手動でエラーを出力
                    append_error_ajax(error.label,error.errors);
                })
            },
        });
    }

    // スコア表示用のメソッド
    displayScores(scores) {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
    
        // テキストの位置を設定
        const title = this.add.text(
            centerX, 90, 
            'Ranking', {
            fontFamily: '"Press Start 2P"',
            fontSize: '64px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        if (scores.length === 0) {
            this.add.text(
                centerX, centerY, 
                'No scores yet!', {
                fontFamily: '"Press Start 2P"',
                fontSize: '32px',
                color: '#ffcccc',
                align: 'center'
            }).setOrigin(0.5);
            return;
        }
    
        // スクロールパネル作成
        const panel = this.rexUI.add.scrollablePanel({
            x: centerX,
            y: centerY + 50,
            width: this.scale.width - 200,
            height: centerY + 100,
    
            scrollMode: 0, // 0=vertical, 1=horizontal
    
            background: this.add.rectangle(0, 0, 600, 400, 0x222222).setStrokeStyle(2, 0xffffff),
    
            panel: {
                child: this.rexUI.add.fixWidthSizer({
                    space: { top: 10, bottom: 10, left: 10, right: 10, item: 10 },
                }),
            },
    
            slider: {
                track: this.add.rectangle(0, 0, 20, 10, 0x555555),
                thumb: this.add.rectangle(0, 0, 20, 40, 0xffffff),
            },
    
            mouseWheelScroller: {
                focus: false,
                speed: 0.1
            },
    
            space: {
                left: 10,
                right: 10,
                top: 10,
                bottom: 10,
                panel: 10,
            }
        })
        .layout();
    
        const sizer = panel.getElement('panel');  // FixWidthSizer
    
        // スコアリストを作成
        scores.forEach((scoreData, index) => {
            // スコア表示を km と m に分ける
            let scoreDisplay;
            if (scoreData.score > 1000000) {
                scoreDisplay = (scoreData.score / 1000).toFixed(0) + ' km';
            } else if (scoreData.score > 1000) {
                scoreDisplay = (scoreData.score / 1000).toPrecision(3) + ' km';
            } else {
                scoreDisplay = scoreData.score.toPrecision(3) + ' m';
            }
        
            // sizerの周りを囲う
            // const background = this.add.rectangle(0, 0, 600, 60, 0x333333)
            // 1列分のSizerを作る
            const row = this.rexUI.add.sizer({
                orientation: 'horizontal', // 横並び（x方向）
                space: {
                    top: 10,
                    bottom: 10,
                    item: 100 
                },
                // background: background
            });
        
            // 順位
            const rankText = this.add.text(0, 0, `${index + 1}.`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '24px',
                color: '#ffffff'
            }).setOrigin(0.5);

            // // アイコン
            // const avatar = this.add.image(0, 0, 'tilemap', 264)
            //     .setDisplaySize(48, 48);

            // 名前
            const username = this.add.text(0, 0, scoreData.user.username, {
                fontFamily: 'DotGothic16',
                fontSize: '24px',
                color: '#ffffcc'
            }).setOrigin(0.5);
            
            // 更新日時
            const updatedAt = this.add.text(0, 0, scoreData.updated_at || 'N/A', {
                fontFamily: '"Press Start 2P"',
                fontSize: '24px',
                color: '#cccccc'
            }).setOrigin(0.5);

            // スコア
            const scoreLabel = this.add.text(0, 0, scoreDisplay, {
                fontFamily: '"Press Start 2P"',
                fontSize: '24px',
                color: '#ffcc99',
                align: 'right'
            }).setOrigin(0.5);

        
            // rowにパーツを追加
            row.add(rankText, 1, 'center');
            // row.add(avatar, 0, 'center');  // avatarにのみx軸マージンを追加
            row.add(username, 1, 'center');
            row.add(updatedAt, 1, 'center');
            row.add(scoreLabel, 1, 'right');  // ← scoreLabelだけ伸びる (proportion:1)
        
            // 全体のsizerに追加
            sizer.add(row, 0, 'left', 0, true);
        });
    
        panel.layout();

        // スライダー調整
        const itemHeight = 50; // 1項目あたりの高さ（だいたい）
        const visibleItemCount = Math.floor((centerY + 100 - 20) / itemHeight); // パネル内に収まるアイテム数

        if (scores.length <= visibleItemCount) {
            // 項目数が少ない → スライダー非表示
            panel.getElement('slider.track').setVisible(false);
            panel.getElement('slider.thumb').setVisible(false);
        } else {
            // 項目数が多い → スライダーをリストに合わせて調整（オプションで）
            const thumb = panel.getElement('slider.thumb');
            let thumbHeightRatio = visibleItemCount / scores.length;
            thumb.setDisplaySize(20, Math.max(40, (centerY + 100) * thumbHeightRatio));
        }
    }
    createBackBtn() {
        const button = this.add.sprite(100, 80, 'inputPrompts', 608);  // (x, y, key, frame)
        // ボタンにインタラクションを追加（クリックイベント）
        button.setDisplaySize(48 *3/2, 48);
        button.setInteractive({ useHandCursor: true });
        button.setFlipX(true);  // 水平方向に反転
        button.on('pointerdown', this.goBackScene.bind(this));

        // ホバー時の色変更（マウスオーバー）
        button.on('pointerover', () => {
            button.setTint(0x44ff44);  // ホバー時に緑色に変更
        });
        // ホバーを外した時の色を戻す（マウスアウト）
        button.on('pointerout', () => {
            button.clearTint();  // 色を元に戻す
        });
    }
}
