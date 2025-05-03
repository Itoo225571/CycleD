import { gameOptions } from '../config.js';

export default class MapManager {
    constructor(scene, tilesetKeyArray) {
        this.scene = scene;
        this.tilesetKeyArray = tilesetKeyArray; // 複数 tileset に対応
        this.chunkWidth = 0;
        this.nextChunkX = 0;
        this.chunks = gameOptions.chunks;
        this.addedChunks = [];
        this.layerPool = [];
        this.collisionTiles = [];
        this.enemyPool = [];  // プールを初期化
        this.enemies = [];  // プールを使用して再利用される敵の配列

        this.scene.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
        
                const spriteA = bodyA.gameObject;
                const spriteB = bodyB.gameObject;
        
                // どちらかがenemyであるか確認（enemyはスプライト）
                if ((this.isEnemy(spriteA) && bodyB.label === 'player') || (this.isEnemy(spriteB) && bodyA.label === 'player')) {
                    const enemy = this.isEnemy(spriteA) ? spriteA : spriteB;
                    const player = bodyA.label === 'player' ? spriteA : spriteB;
                    this.onEnemyCollision(player,enemy);
                }
            });
        });
    }

    addNextChunk() {
        const randomIndex = Math.floor(Math.random() * this.chunks.length);
        const chunkKey = this.nextChunkX === 0 ? gameOptions.startChunk : this.chunks[randomIndex];
        const chunkMap = this.scene.make.tilemap({ key: chunkKey });

        // 複数 tileset の登録
        const tilesets = this.tilesetKeyArray.map(key => {
            return chunkMap.addTilesetImage(key.nameInTiled, key.textureKey);
        });

        // 各レイヤーを作成（適切な tileset を自動選択）
        this.backgroundLayer = this.getLayerFromPool(chunkMap, 'Background', tilesets).setDepth(-2);
        this.decoLayer = this.getLayerFromPool(chunkMap, 'Deco', tilesets).setDepth(-1);
        this.itemLayer = this.getLayerFromPool(chunkMap, 'Item', tilesets).setDepth(0);
        // this.enemyLayer = this.getLayerFromPool(chunkMap, 'Enemy', tilesets).setDepth(1);

        this.groundLayer = safeCreateLayer(chunkMap, 'Ground', tilesets, this.nextChunkX, 0).setDepth(2);
        this.blockLayer = safeCreateLayer(chunkMap, 'Block', tilesets, this.nextChunkX, 0).setDepth(3);

        this.convertLayerToMatterBodies(this.groundLayer, 'ground');
        if (this.blockLayer) {
            this.convertLayerToMatterBodies(this.blockLayer, 'block');
        }

        // 敵キャラクターの生成
        this.setEnemies(chunkMap);

        this.chunkWidth = chunkMap.widthInPixels;
        this.nextChunkX += this.chunkWidth;

        this.addedChunks.push(this.backgroundLayer, this.decoLayer, this.groundLayer, this.blockLayer, this.itemLayer);
        this.manageLayerPool(5);
    }

    setEnemies(chunkMap) {
        const objectLayer = chunkMap.getObjectLayer('EnemyObjects');
        if (objectLayer) {
            objectLayer.objects.forEach(obj => {
                const name = obj.name;
                const width = obj.width;
                const height = obj.height;
    
                // 敵スプライトをプールから取得
                const enemy = this.getEnemyFromPool(name, obj.x + this.nextChunkX, obj.y); // x 座標に nextChunkX を加算
                enemy.chunkX = this.nextChunkX;
    
                // アニメーション再生
                enemy.play(name + 'Run');
    
                // Tiledのプロパティからspeedとdirectionを取得
                enemy.speed = obj.properties.find(prop => prop.name === 'speed')?.value || 1;  // speedのデフォルト値は1
                enemy.direction = obj.properties.find(prop => prop.name === 'direction')?.value || 'left';  // directionのデフォルトは'left'
                enemy.weak = obj.properties.find(prop => prop.name === 'weak')?.value || 'none';  // 弱点 通常はなし
    
                // 元のボディを削除して、Tiledのサイズで矩形ボディを作り直す
                const { Bodies } = Phaser.Physics.Matter.Matter;
                const newBody = Bodies.rectangle(obj.x + this.nextChunkX, obj.y, width, height, { label: 'enemy' });
    
                enemy.setExistingBody(newBody);
                enemy.setPosition(obj.x + this.nextChunkX, obj.y);  // スプライトの位置を再設定
    
                enemy.body.friction = 0;  // 敵の動摩擦
                enemy.body.frictionStatic = 0;  // 敵が動き出すための摩擦
                enemy.body.frictionAir = 0;  // 敵の空気抵抗
                enemy.body.gravityScale = 1;  // 重力を適用（1倍の重力）

                // 位置調整
                enemy.setFixedRotation();  // 回転しないようにする

                this.enemies.push(enemy);  // 現在の敵リストにも追加
            });
        }
    }    

    getEnemyFromPool(name, x, y) {
        // プールから非アクティブな敵を探して取得
        let enemy = this.enemyPool.find(e => !e.active);
        if (enemy) {
            // 再利用
            enemy.setTexture(name + 'Run');
            enemy.setPosition(x, y);
            enemy.setActive(true);
            enemy.setVisible(true);
        } else {
            // 新規作成
            enemy = this.scene.matter.add.sprite(x, y, name + 'Run');
            enemy.setOrigin(0.5, 1);  // 中央下基準
            this.enemyPool.push(enemy);  // プールに追加
        }
        
        return enemy;
    }

    addEnemyToPool(enemy) {
        // プールに戻す処理
        enemy.setActive(false);
        enemy.setVisible(false);
    }

    updateEnemies() {
        const cameraRight = this.scene.cameras.main.scrollX + this.scene.cameras.main.width;

        this.enemies.forEach(enemy => {
            // プレイヤーが敵のチャンクに入ったかどうかをチェック
            var speed = enemy.speed;
            if (cameraRight < enemy.chunkX || cameraRight > enemy.chunkX + this.chunkWidth) {
                speed = speed / 3;  // ちょっとは動かす
            }
            const direction = enemy.direction;  // 敵の移動方向
    
            // プレイヤーがチャンク内にいる間、敵を動かす
            if (direction === 'left') {
                enemy.setVelocityX(-speed);  // 左に移動
            } else if (direction === 'right') {
                enemy.setVelocityX(speed);   // 右に移動
            }
        });
    }

    isEnemy(sprite) {
        return this.enemies.includes(sprite);
    }
    
    onEnemyCollision(player,enemy) {
        // プレイヤーと敵の位置を取得
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        // X軸とY軸両方の変化に基づいて方向を判定
        let collisionDirection = '';
        if (Math.abs(dx) > Math.abs(dy) +  gameOptions.oneBlockSize/6 ) {  // X方向の変化が大きい場合
            collisionDirection = dx > 0 ? 'right' : 'left';
        } else {  // Y方向の変化が大きい場合
            collisionDirection = dy > 0 ? 'down' : 'up';
        }

        if (collisionDirection === enemy.weak) {
            return;
        } else {
            this.scene.loseLife();
        }
    }

    convertLayerToMatterBodies = (layer, label) => {
        if (!layer) return;

        layer.setCollisionByProperty({ collides: true });
        this.scene.matter.world.convertTilemapLayer(layer);

        layer.forEachTile(tile => {
            if (tile.properties.collides) {
                const matterBody = tile.physics.matterBody?.body;
                if (matterBody) {
                    this.collisionTiles.push(matterBody);
                }
            }
        });
    };

    getLayerFromPool(chunkMap, name, tilesets) {
        let layer = this.layerPool.find(layer => layer.name === name && !layer.visible);
        if (!layer) {
            layer = safeCreateLayer(chunkMap, name, tilesets, this.nextChunkX, 0);
        }
        return layer;
    }

    manageLayerPool(typeNum) {
        let returnCount = typeNum * 3;
        if (this.addedChunks.length < returnCount) return;

        for (let i = 0; i < typeNum; i++) {
            const oldLayer = this.addedChunks.shift();
            if (oldLayer) {
                if (oldLayer.body) {
                    this.scene.matter.world.remove(oldLayer.body);
                }
                oldLayer.setVisible(false);
                this.layerPool.push(oldLayer);
            }
        }
    }

    resetMap(exBodies = []) {
        const Matter = Phaser.Physics.Matter.Matter;
        const world = this.scene.matter.world.localWorld;

        const allBodies = Matter.Composite.allBodies(world);

        allBodies.forEach(body => {
            if (!exBodies.includes(body)) {
                Matter.World.remove(world, body);
            }
        });

        // スプライトとしての enemy を破棄
        this.enemies.forEach(enemy => {
            // プールに戻す
            this.addEnemyToPool(enemy);
        });
        this.enemies = [];

        // レイヤーの非表示＆プール戻し
        this.addedChunks.forEach(layer => {
            if (layer) {
                layer.setVisible(false);
                this.layerPool.push(layer);
            }
        });

        this.addedChunks = [];
        this.nextChunkX = 0;
    }
}

// 複数タイルセット対応
function safeCreateLayer(map, name, tilesets, x, y) {
    const layerData = map.layers.find(layer => layer.name === name);
    if (!layerData) return null;

    // 対応する tileset を自動判定
    for (let tileset of tilesets) {
        const layer = map.createLayer(name, tileset, x, y);
        if (layer) return layer;
    }
    return null;
}
