import { gameOptions } from './config.js';
import BgmManager from './class/BgmManager.js';
import SfxManager from './class/SfxManager.js';
import { PlayerOptions } from './class/PlayerOptions.js';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        // msgウィンドウ
        this.load.spritesheet(
            'msgWindowTile', 
            `${imgDir}Panel/panel-008.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
        this.load.spritesheet(
            'msgWindowTileTransparent', 
            `${imgDir}PanelTransparent/panel-008.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
        this.load.spritesheet(
            'msgWindowTileBorder', 
            `${imgDir}PanelBorder/panel-008.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
        // btn
        this.load.spritesheet(
            'btnTile', 
            `${imgDir}Panel/panel-022.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
        this.load.spritesheet(
            'btnTileTransparent', 
            `${imgDir}PanelTransparent/panel-022.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
        // ranking window
        this.load.spritesheet(
            'rankingWindowTile', 
            `${imgDir}PanelBorder/panel-014.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
        // heart
        this.load.spritesheet(
            'heartIcon', 
            `${imgDir}heart.png`, 
            { frameWidth: 20, frameHeight: 18 }
        );
        this.load.spritesheet(
            'heartHalfIcon', 
            `${imgDir}heartHalf.png`, 
            { frameWidth: 20, frameHeight: 18 }
        );
        
        // 入力用
        this.load.spritesheet(
            'inputPrompts', 
            `${imgDir}/input_prompts.png`, 
            { frameWidth: 16, frameHeight: 16 }
        );
        // 背景画像
        const bgFolders = [
            { name: 'background1/', num: 4},
            { name: 'background2/', num: 3},
        ];
        // 昼夜で切り替え
        const selected = Phaser.Math.RND.pick(bgFolders);
        const folder = imgDir + selected.name;
        this.load.image('background', `${folder}/background.png`);  // 背景（共通）読み込み
        // 選ばれたディレクトリ内のlayer画像を読み込む
        for (let i = 1; i <= selected.num; i++) {
            this.load.image(`layer${i}`, `${folder}/layer${i}.png`);
        }

        // item
        this.items = [
            { name : 'coin_bronze', size: 32, start:0, end:5 },
            { name : 'coin_gold', size: 32, start:0, end:5, frameRate: 10 }
        ];
        this.items.forEach(({ name, size}) => {
            this.load.spritesheet(
                name, 
                `${imgDir}${name}.png`, 
                { frameWidth: size, frameHeight: size },    // 拡大して使う
            );
        });

        // trap
        this.traps = [
            { name : 'SpikeBall', size: 28, start:0, end:0 }
        ];
        this.traps.forEach(({ name, size}) => {
            this.load.spritesheet(
                name, 
                `${imgDir}${name}.png`, 
                { frameWidth: size, frameHeight: size },    // 拡大して使う
            );
        });

        // Enemy
        this.enemySituations = [
            'Hit',
            'Idle',
            'Run',
        ]
        this.enemyList = [
            {name:'MonsieurMush', height: 32, width: 32},
            {name:'TBird', height: 32, width: 32},
            {name:'AngryPig', height: 30, width: 36},
        ]
        this.enemyList.forEach((enemy) => {
            this.enemySituations.forEach((situation) => {
                this.load.spritesheet(
                    enemy.name + situation, 
                    `${imgEnemyDir}${enemy.name}/${situation}.png`, 
                    {
                        frameWidth: enemy.width,
                        frameHeight: enemy.height
                    }
                );
            });
        });        

        //player
        this.playerSituations = [
            'DoubleJump',
            'Fall',
            'Hit',
            'Idle',
            'Jump',
            'Run',
            'WallJump'
        ];
        this.playerNames = [
            'NinjaFrog',
            'MaskMen',
            'Pigger',
            'Diver',
        ];
        this.playerNames.forEach((chara) => {  // アロー関数に変更
            this.playerSituations.forEach((situation) => {  // アロー関数に変更
                this.load.spritesheet(
                    chara + situation, 
                    `${imgPlayerDir}${chara}/${situation}.png`, 
                    { frameWidth: 32, frameHeight: 32 }
                );
            });
        });
        
        // アイコンなど
        this.load.image('lock', `${imgDir}lock.png`);
        this.load.image('unlock', `${imgDir}unlock.png`);
        this.load.image('settings', `${imgDir}Settings.png`);

        // エフェクト
        this.load.spritesheet(
            'SelectEffect', 
            `${imgDir}Select.png`, 
            { frameWidth: 96, frameHeight: 96 }
        );

        // 効果音
        this.load.audio('jumpSound', `${soundDir}/jump.wav`);
        this.load.audio('stompSound', `${soundDir}/stomp.mp3`);
        this.load.audio('damageSound', `${soundDir}/damage.wav`);
        this.load.audio('fallingSound', `${soundDir}/falling.wav`);
        this.load.audio('alarmSound', `${soundDir}/alarm.wav`);
        this.load.audio('coinSound', `${soundDir}/coin.wav`);
        this.load.audio('impactSound', `${soundDir}/impact.wav`);
        this.load.audio('buttonSoftSound', `${soundDir}/buttonSoft.wav`);
        this.load.audio('buttonHardSound', `${soundDir}/buttonHard.wav`);
        this.load.audio('pauseSound', `${soundDir}/pause.wav`);
        this.load.audio('selectedSound', `${soundDir}/selected.wav`);

        // bgm読み込み
        this.load.audio('bgmDrops', `${soundDir}/bgm/drops.mp3`);
        this.load.audio('bgmRunning', `${soundDir}/bgm/running.mp3`);
        this.load.audio('bgmGameOver', `${soundDir}/bgm/game_over.mp3`);

        // map読み込み
        this.loadMap();
    }

    create() {
        // Charachter Animation
        this.createCharaAnims();
        // Enemy Animation
        this.createEnemyAnims();
        // Item Animation
        this.createItemAnims();
        // Trap Animation
        this.createTrapAnims();

        this.anims.create({
            key: 'SelectAnim',
            frames: this.anims.generateFrameNumbers('SelectEffect', { start: 2, end: 6 }),
            frameRate: 10,
            repeat: 0
        });
        this.anims.create({
            key: 'heartAnim',
            frames: this.anims.generateFrameNumbers('heartIcon', { start: 0, end: 20 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'heartHalfAnim',
            frames: this.anims.generateFrameNumbers('heartHalfIcon', { start: 0, end: 20 }),
            frameRate: 10,
            repeat: -1
        });

        // ユーザー情報取得
        this.getGameData();

        // ajaxで情報を取得してからスタート
        this.events.on('gameDataLoaded', (data) => {
            var players = data.players;
            var key = data.user_info.character_last;
            this.registry.set('selectedCharacter', players[key]);   // 前回使用したキャラをセット
            this.scene.start('PreStartScene');
        });   
    }

    createCharaAnims() {
        this.playerNames.forEach((name) => {  // アロー関数に変更
            this.anims.create({
                key: name + 'Run',
                frames: this.anims.generateFrameNumbers(name + 'Run', { start: 0, end: 11 }),
                frameRate: 30,
                repeat: -1
            });
            this.anims.create({
                key: name + 'Jump',
                frames: this.anims.generateFrameNumbers(name + 'Jump', { start: 0, end: 0 }),
                frameRate: 1,
                repeat: -1
            });
            this.anims.create({
                key: name + 'Jump_ex',
                frames: this.anims.generateFrameNumbers(name + 'DoubleJump', { start: 0, end: 5 }),
                frameRate: 40,
                repeat: -1
            });
            this.anims.create({
                key: name + 'Idle',
                frames: this.anims.generateFrameNumbers(name + 'Idle', { start: 0, end: 10 }),
                frameRate: 12,
                repeat: -1
            });
            this.anims.create({
                key: name + 'Dead',
                frames: this.anims.generateFrameNumbers(name + 'Hit', { start: 0, end: 6 }),
                frameRate: 1,
                repeat: 0
            });
        });
    }
    createEnemyAnims() {
        this.enemyList.forEach((enemy) => {
            var name = enemy.name;
            const getFrameCount = (key) => {
                const texture = this.textures.get(key);
                if (!texture) {
                    console.warn(`Texture for ${key} not found`);
                    return 0;
                }
    
                // フレーム数 = キーに紐づくフレームの数（frameNumberが整数のものだけ）
                return Object.keys(texture.frames)
                    .filter(f => !isNaN(parseInt(f)))  // "0", "1", ..., "13" のようなものだけ
                    .length;
            };
    
            const runKey = name + 'Run';
            const idleKey = name + 'Idle';
            const deadKey = name + 'Hit';
    
            const runEnd = getFrameCount(runKey) - 1;
            const idleEnd = getFrameCount(idleKey) - 1;
            const deadEnd = getFrameCount(deadKey) - 1;
    
            this.anims.create({
                key: name + 'Run',
                frames: this.anims.generateFrameNumbers(runKey, { start: 0, end: runEnd }),
                frameRate: 30,
                repeat: -1
            });
    
            this.anims.create({
                key: name + 'Idle',
                frames: this.anims.generateFrameNumbers(idleKey, { start: 0, end: idleEnd }),
                frameRate: 10,
                repeat: -1
            });
    
            this.anims.create({
                key: name + 'Dead',
                frames: this.anims.generateFrameNumbers(deadKey, { start: deadEnd, end: deadEnd }),     //アニメーションにしない
                frameRate: 100,
                repeat: 0
            });
        });
    }
    
    createItemAnims() {
        this.items.forEach(({ name, size, start, end, frameRate }) => {
            this.anims.create({
                key: name,
                frames: this.anims.generateFrameNumbers(name, { start: start, end: end }),
                frameRate: frameRate || 15,
                repeat: -1
            }); 
        });
    }

    createTrapAnims() {
        this.traps.forEach(({ name, size, start, end }) => {
            if(start === end) {
                this.anims.create({
                    key: name,
                    frames: this.anims.generateFrameNumbers(name, { start: start, end: end }),
                    frameRate: 0,
                    repeat: 0,
                }); 
            } else {
                this.anims.create({
                    key: name,
                    frames: this.anims.generateFrameNumbers(name, { start: start, end: end }),
                    frameRate: 15,
                    repeat: -1
                }); 
            }
        });
    }

    loadMap() {
        // 地面
        this.load.spritesheet('Tiles1', `${imgDir}Tiles1.png`, {
            frameWidth: 32,
            frameHeight: 32,
        });
        var mapList = gameOptions.chunks;
        var startMap = gameOptions.startChunk;
        mapList.forEach((name) => {  // アロー関数に変更
            this.load.tilemapTiledJSON(name, `${jsonDir}${name}.json`); // mapをロード
        });
        this.load.tilemapTiledJSON(startMap, `${jsonDir}${startMap}.json`);
    }

    getGameData() {
        $.ajax({
            url: '/games/run/get_data/',  // ← このURLはDjangoのルーティングに合わせる
            type: 'GET',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            dataType: 'json',
            success: (data) => {
                // データを registry に保存
                this.registry.set('playersData', data.players);
                this.registry.set('userInfo', data.user_info);
                this.registry.set('scoreData', data.score);

                // optionをレジストリに保存
                const options = new PlayerOptions(data.user_info.options);
                this.registry.set('playerOptions', options);
                // 一度だけグローバルにBGMマネージャを登録
                if (!this.registry.get('bgmManager')) {
                    const bgmManager = new BgmManager(this,options);
                    this.registry.set('bgmManager', bgmManager);
                }
                // 一度だけグローバルに効果音マネージャを登録
                if (!this.registry.get('sfxManager')) {
                    const sfxManager = new SfxManager(this,options);
                    this.registry.set('sfxManager', sfxManager);
                }

                this.events.emit('gameDataLoaded', data);   // 合図
            },
            // preload時点でのエラーならalertでいいんじゃないかな
            error: function(xhr, status, error) {
                let detailMessage = '';
                try {
                    detailMessage = xhr.responseJSON?.detail || '不明なエラー';
                } catch (e) {
                    detailMessage = 'エラーレスポンスの解析に失敗しました';
                }
        
                switch (xhr.status) {
                    case 400:
                        alert('不正なリクエストです: ' + detailMessage);
                        break;
                    case 401:
                        alert('認証されていません。ログインしてください。');
                        break;
                    case 403:
                        alert('アクセスが拒否されました。');
                        break;
                    case 404:
                        alert('データが見つかりません: ' + detailMessage);
                        break;
                    case 500:
                        alert('サーバーエラー: ' + detailMessage);
                        break;
                    default:
                        alert('予期しないエラーが発生しました: ' + detailMessage + '（コード: ' + xhr.status + '）');
                }
            },
        });        
    }
}
