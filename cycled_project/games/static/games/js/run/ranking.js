export default class RankingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RankingScene' });
    }
    create() {      
        this.getScores();   
    }

    goBackScene() {
        var scene = this.preScene || 'StartScene';
        // RankingSceneを停止
        this.scene.stop('RankingScene');
        // 前のシーンを再起動
        this.scene.launch(scene);  // 前のシーンのキーを指定
    }

    getScores() {
        $.ajax({
            url: '/games/api/score_nikirun/',
            method: 'GET',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            success: (response) => {
                // => を使えば，外側のthisをそのまま使える
                // スコアをランキングに表示する処理
                this.displayScores(response);
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
        const centerY = this.scale.height / 2
        let startY = 150;
    
        const title = this.add.text(
            centerX, 80, 
            'Ranking', {
            fontFamily: '"Press Start 2P"',
            fontSize: '64px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    
        // スコアがない場合
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
    
        // スコアを順番に表示
        scores.forEach((scoreData, index) => {
            let rankText = `${index + 1}. ${scoreData.user.username} - ${scoreData.score}`;
    
            this.add.text(centerX, startY, rankText, {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                color: '#ffffcc',
                align: 'center'
            }).setOrigin(0.5);
    
            startY += 50; // 次の行へ
        });
    }
    
}
