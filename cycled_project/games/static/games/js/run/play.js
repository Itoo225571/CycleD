import { gameOptions, CATEGORY, chargeSkillTable } from './config.js';
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

        // // 読み込んだJSONにスキル関数を追加
        // プレイヤーデータを取得
        const charaData = this.registry.get('playersData');
        // null のキャラクターを除外して選択可能なキャラだけにする
        const validCharaData = Object.values(charaData).filter(chara => chara !== null);
        // 選択したキャラクターを取得、もし選択されていなければ最初のキャラを使う
        const selectedCharacter = this.registry.get('selectedCharacter') || validCharaData[0];
        // 選択されたキャラの設定を作成
        const characterConfig = {
            ...selectedCharacter,
            chargeSkill: chargeSkillTable[selectedCharacter.chargeSkill]  // スキルのマッピング
        };

        // プレイヤーオブジェクトを作成
        this.player = new Player(this, characterConfig);


        this.input.on("pointerdown", () => this.player.jump(false), this);
        this.input.keyboard.on("keydown-SPACE", () => this.player.jump(false), this);        

        var tilesets = gameOptions.tilesets;
        this.mapManager = new MapManager(this, tilesets);
        this.mapManager.addNextChunk();

        // カメラが追いかける中心点
        this.centerPoint = this.matter.add.sprite(this.scale.width / 2, this.scale.height / 2, null);
        this.centerPoint.setVisible(false);
        this.centerPoint.setIgnoreGravity(true);
        this.cameras.main.startFollow(this.centerPoint, false, 1, 0);
        this.centerPoint.body.isSensor = true;

        // スコアの表示
        this.distText = this.add.text(30, 20, `0.0`, {
            fontFamily: 'DTM-Sans',
            fontSize: '32px',
            fill: '#ffffff'
        }).setScrollFactor(0).setDepth(100);
        // チャージバー
        var barX = 30, barY = 80, barWidth = 200, barHeight = 20;
        var bgBar = this.add.rectangle(barX, barY, barWidth, barHeight, 0x444444)
                    .setOrigin(0, 0.5)
                    .setScrollFactor(0)
                    .setAlpha(0.7)
                    .setDepth(99);;
        var chargeBar = this.add.rectangle(barX, barY, 0, barHeight, 0x00ff00)
                    .setOrigin(0, 0.5)
                    .setScrollFactor(0)
                    .setDepth(100);
        this.player.createChargeBar(bgBar,chargeBar);
        // life
        this.lifeText = this.add.text(30, 120, `0`, {
            fontFamily: 'DTM-Sans',
            fontSize: '32px',
            fill: '#ffffff'
        }).setScrollFactor(0).setDepth(100);

        // ポーズボタン
        this.pauseButton = this.add.sprite(this.cameras.main.width - 50, 50, 'inputPrompts', 538)
                            .setOrigin(0.5)
                            .setScrollFactor(0)
                            .setDisplaySize(64,64)
                            .setInteractive({ useHandCursor: true })
                            .setDepth(100);
        this.pauseButton.on('pointerdown', this.pauseGame, this);
        window.addEventListener('blur', () => {
            this.pauseGame();
        });        

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
        this.mapManager.update();

        // スコア更新表示
        this.score = this.player.dist + this.player.distPre;
        this.distText.setText(`${strScore(this.score)}`);
        this.lifeText.setText(`${this.player.onSkill}`);

        const leftBound = cam.scrollX - (cam.width / 6);
        const bottomBound = cam.scrollY + cam.height * 7 / 6;
        const outOfBounds = this.player.x < leftBound || this.player.y > bottomBound;
        if (outOfBounds) {
            this.loseLife(false);
        }
    }    

    loseLifeAfetr() {
        const is_alive = this.player.loseLifePlayer();

        if (is_alive) {
            this.respawnPlayer();
        } else {
            // this.scene.start('StartScene');
            this.GameOver();
        }
    }
    loseLife(jump=false) {
        this.isPaused = true;
        this.cameras.main.stopFollow();
        this.input.enabled = false;
        this.matter.world.pause();
        
        // Matterの影響を受けないように静的化＆非衝突化
        this.player.setStatic(true);
        this.player.setCollisionCategory(null); // 衝突カテゴリを解除（またはマスクを0に）
        this.player.setVisible(true);
        this.player.setActive(false);

        this.player.anims.stop(); // アニメーション停止
        // フレーム指定でテクスチャを一時的に切り替え
        this.player.setTexture(this.player.playerName + 'Hit', 6); // 第2引数にフレーム番号（または名前）
        this.player.setDepth(10);   //この時だけ最前線で表示
    
        if (jump) {
            this.cameras.main.shake(500,0.01);  //画面振動

            // 上昇して落下するTween
            this.time.delayedCall(500, () => {
                // 回転アニメーション
                this.tweens.add({
                    targets: this.player,
                    angle: 360 * 4,               // 4回転（視覚だけ）
                    duration: 1000,
                    ease: 'Linear',
                });
                // 落下
                this.tweens.add({
                    targets: this.player,
                    y: this.player.y - 200,          // 100px上昇
                    duration: 500,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                        // 上昇が完了したら急降下
                        this.tweens.add({
                            targets: this.player,
                            y: this.scale.height + 200,      // 急降下
                            duration: 500,               // 速い落下
                            ease: 'Sine.easeIn',         // 急激に落ちるように設定
                            onComplete: () => {
                                this.loseLifeAfetr(); // アニメーション後に後処理を呼び出し
                            }
                        });
                    }
                });
            });
        } else {
            this.cameras.main.shake(500,0.01);  //画面振動
            this.time.delayedCall(1500, () => {
                this.loseLifeAfetr();
            });
        }
    }

    respawnPlayer() {
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
        this.player.setVelocity(1,1);

        this.elapsedTime = 0;

        this.isPaused = false;
        this.input.enabled = true;
        this.matter.world.resume();
    }
    rePlayGame() {
        this.scene.restart();
        this.isPaused = false;
    }

    pauseGame() {
        if (!this.scene.isActive('PlayScene')) return;
        if (this.scene.isPaused('PlayScene')) return;  //重複を避ける

        this.isPaused = true;
        this.input.enabled = false;  // 全体の入力を一時的に無効化
        this.scene.pause();

        if (!this.scene.isActive('PauseScene')) {
            // 起動していなければ、RankingSceneをオーバーレイとして開始
            this.scene.launch('PauseScene');
        }
        const pauseScene = this.scene.get('PauseScene');
        pauseScene.onBringToTop?.();  // ポーズ時に実行する関数
        this.scene.bringToTop('PauseScene');
    }
    
    resumeGame() {
        this.scene.resume();
        this.matter.world.resume();     // これを入れないと動かない
        this.input.enabled = true; 
        this.isPaused = false;
    }
    
    GameOver() {
        if (!this.scene.isActive('PlayScene')) return;
        if (this.scene.isPaused('PlayScene')) return;  //重複を避ける

        this.isPaused = true;
        this.input.enabled = false;  // 全体の入力を一時的に無効化
        this.scene.pause();

        if (!this.scene.isActive('GameoverScene')) {
            // 起動していなければ、RankingSceneをオーバーレイとして開始
            this.scene.launch('GameoverScene');
        }
        const GameoverScene = this.scene.get('GameoverScene');
        GameoverScene.onBringToTop?.(true);  // 引数 true を渡す(投稿する)
        this.scene.bringToTop('GameoverScene');
    }

    goRankingScene() {
        // this.preScene = 'PlayScene';
        this.scene.get('RankingScene').data.set('previousScene', 'PlayScene');

        if (!this.scene.isActive('RankingScene')) {
            this.scene.launch('RankingScene');
        }
        const RankingScene = this.scene.get('RankingScene');
        RankingScene.onBringToTop?.();
        this.gameOverText.setAlpha(0);  //titleを隠す
        this.scene.bringToTop('RankingScene');
    }

    // シーン終了時にイベントリスナーを削除
    shutdown() {
        // window.removeEventListener('blur', this.handleBlur);
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

