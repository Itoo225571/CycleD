import { gameOptions } from '../config.js';

export default class MapManager {
    constructor(scene, tilesetKeyArray) {
        this.scene = scene;
        this.tilesetKeyArray = tilesetKeyArray;
        this.chunkWidth = 0;
        this.nextChunkX = 0;
        this.chunks = gameOptions.chunks;
        this.currentChunkIndex = 0;    //チャンク番号
        this.addedChunks = [];
        this.layerPool = this.scene.add.group();  // Phaser Group に変更
        this.collisionTiles = [];
        this.enemyPool = this.scene.add.group();  // Phaser Group に変更
        this.enemies = [];  
        this.items = [];
        this.itemPool = this.scene.add.group();  // Phaser Group に変更

        this.bgImagePool = this.scene.add.group();

        this.scene.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
        
                const spriteA = bodyA.gameObject;
                const spriteB = bodyB.gameObject;
        
                if ((this.isEnemy(spriteA) && bodyB.label === 'player') || (this.isEnemy(spriteB) && bodyA.label === 'player')) {
                    const enemy = this.isEnemy(spriteA) ? spriteA : spriteB;
                    const player = bodyA.label === 'player' ? spriteA : spriteB;
                    this.onEnemyCollision(player, enemy);
                }

                if ((this.isItem(spriteA) && bodyB.label === 'player') || (this.isItem(spriteB) && bodyA.label === 'player')) {
                    const item = this.isItem(spriteA) ? spriteA : spriteB;
                    const player = bodyA.label === 'player' ? spriteA : spriteB;
                    this.onItemPickup(player, item);
                }
            });
        });
    }

    addNextChunk() {
        const randomIndex = Math.floor(Math.random() * this.chunks.length);
        const chunkKey = this.nextChunkX === 0 ? gameOptions.startChunk : this.chunks[randomIndex];
        const chunkMap = this.scene.make.tilemap({ key: chunkKey });

        const tilesets = this.tilesetKeyArray.map(key => {
            return chunkMap.addTilesetImage(key.nameInTiled, key.textureKey);
        });

        this.backgroundLayer = this.getLayerFromPool(chunkMap, 'Background', tilesets).setDepth(-2);
        this.decoLayer = this.getLayerFromPool(chunkMap, 'Deco', tilesets).setDepth(-1);
        // this.itemLayer = this.getLayerFromPool(chunkMap, 'Item', tilesets).setDepth(0);

        this.groundLayer = safeCreateLayer(chunkMap, 'Ground', tilesets, this.nextChunkX, 0).setDepth(2);
        this.blockLayer = safeCreateLayer(chunkMap, 'Block', tilesets, this.nextChunkX, 0).setDepth(3);

        this.convertLayerToMatterBodies(this.groundLayer, 'ground');
        if (this.blockLayer) {
            this.convertLayerToMatterBodies(this.blockLayer, 'block');
        }

        this.setEnemies(chunkMap);
        this.setItems(chunkMap);

        this.items.forEach(item => {
            if (item.chunkIndex + 1 < this.currentChunkIndex) {
                this.addObjToPool(item);
            }
        });
        this.enemies.forEach(enemy => {
            if (enemy.chunkIndex + 1 < this.currentChunkIndex) {
                this.addObjToPool(enemy);
            }
        });

        this.chunkWidth = chunkMap.widthInPixels;
        this.nextChunkX += this.chunkWidth;

        this.addedChunks.push(this.backgroundLayer, this.decoLayer, this.groundLayer, this.blockLayer);
        this.manageLayerPool(4);

        this.currentChunkIndex += 1;
        this.createBackgrounds();
    }

    update() {
        this.updateEnemies();
        this.updateBackgrounds();
    }

    setEnemies(chunkMap) {
        const objectLayer = chunkMap.getObjectLayer('EnemyObjects');
        if (objectLayer) {
            objectLayer.objects.forEach(obj => {
                const name = obj.name;
                const width = obj.width;
                const height = obj.height;

                const enemy = this.getObjFromPool(this.enemyPool, name, obj.x + this.nextChunkX, obj.y);
                enemy.chunkX = this.nextChunkX;
                enemy.play(name + 'Run');

                enemy.speed = getProp(obj, 'speed', 0);
                enemy.direction = getProp(obj, 'direction', 'left');
                enemy.weak = getProp(obj, 'weak', 'none');

                const { Bodies, Vertices } = Phaser.Physics.Matter.Matter;

                function generateEllipsePath(rx, ry, sides = 20) {
                    const path = [];
                    for (let i = 0; i < sides; i++) {
                        const angle = (Math.PI * 2 * i) / sides;
                        const x = Math.cos(angle) * rx;
                        const y = Math.sin(angle) * ry;
                        path.push(`${x},${y}`);
                    }
                    return path.join(' ');
                }

                const ellipseVertices = Vertices.fromPath(
                    generateEllipsePath(width / 2, height / 2, 20)
                );
                const newBody = Bodies.fromVertices(
                    obj.x + this.nextChunkX,
                    obj.y,
                    [ellipseVertices],
                    { label: 'enemy' },
                    true
                );
                enemy.setExistingBody(newBody);
                enemy.setPosition(obj.x + this.nextChunkX + width/2, obj.y + height/2);
                enemy.body.friction = 0;
                enemy.body.frictionStatic = 0;
                enemy.body.frictionAir = 0;
                enemy.body.gravityScale = 1;
                enemy.setFixedRotation();

                // 重力
                const gravityIgnore = getProp(obj, 'gravityIgnore', false);
                enemy.setIgnoreGravity(gravityIgnore);

                enemy.chunkIndex = this.currentChunkIndex;

                this.enemies.push(enemy);
            });
        }
    }

    getObjFromPool(pool, name, x, y) {
        let obj = pool.getFirstDead(false);
        if (obj) {
            obj.setActive(true);
            obj.setVisible(true);
            obj.setTexture(name + 'Run');
            // bodyがnullでないか確認
            if (!obj.body) {
                // bodyがnullの場合、物理エンジンに追加して新しいbodyを設定
                obj = this.scene.matter.add.sprite(x, y, name + 'Run');  // 物理エンジンに新しいスプライトを追加
                obj.setOrigin(0.5, 1); // オリジン設定
                pool.add(obj);  // プールに追加
            }
            obj.setPosition(x, y);
        } else {
            obj = this.scene.matter.add.sprite(x, y, name + 'Run');
            obj.setOrigin(0.5, 1);
            pool.add(obj);
        }
        return obj;
    }

    addObjToPool(obj) {
        obj.setActive(false);
        obj.setVisible(false);
    }

    updateEnemies() {
        const cameraRight = this.scene.cameras.main.scrollX + this.scene.cameras.main.width;

        this.enemies.forEach(enemy => {
            if (!enemy.active) return;  // enemyがアクティブでない場合は処理をスキップ

            var speed = enemy.speed;
            if (cameraRight < enemy.chunkX || cameraRight > enemy.chunkX + this.chunkWidth) {
                speed = speed / 3;
            }
            const direction = enemy.direction;

            if (direction === 'left') {
                enemy.setVelocityX(-speed);
            } else if (direction === 'right') {
                enemy.setVelocityX(speed);
            }
        });
    }

    isEnemy(sprite) {
        return this.enemies.includes(sprite);
    }

    isItem(sprite) {
        return this.items.includes(sprite);
    }
    
    onEnemyCollision(player, enemy) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const angle = Math.atan2(dy, dx); // ラジアン

        // 角度から方向を判定（8方向で割り当て）
        let collisionDirection = '';
        var angular_width = Math.PI / 6;
        if (angle >= - angular_width && angle < angular_width) {
            collisionDirection = 'right';
        } else if (angle >=  angular_width && angle < angular_width * 5) {
            collisionDirection = 'down';
        } else if (angle >= - angular_width * 5 && angle < -angular_width) {
            collisionDirection = 'up';
        } else {
            collisionDirection = 'left';
        }

        if (collisionDirection === enemy.weak) {
            return;
        } else {
            this.scene.loseLife(true);     //ジャンプしながら消滅
        }
    }

    setItems(chunkMap) {
        const objectLayer = chunkMap.getObjectLayer('ItemObjects');
        if (objectLayer) {
            objectLayer.objects.forEach(obj => {
                const name = obj.name;
                const width = obj.width;
                const height = obj.height;

                const item = this.getObjFromPool(this.itemPool, name, obj.x + this.nextChunkX, obj.y);
                item.chunkX = this.nextChunkX;

                item.setDisplaySize(width, height);
                const anims = this.scene.anims;
                if (!anims.exists(name)) {
                    console.warn(`Animation '${name}' が見つかりません. アイテムをスキップしました.`);
                    return;
                }
                item.play(name);

                const { Bodies, Vertices } = Phaser.Physics.Matter.Matter;

                function generateEllipsePath(rx, ry, sides = 20) {
                    const path = [];
                    for (let i = 0; i < sides; i++) {
                        const angle = (Math.PI * 2 * i) / sides;
                        const x = Math.cos(angle) * rx;
                        const y = Math.sin(angle) * ry;
                        path.push(`${x},${y}`);
                    }
                    return path.join(' ');
                }

                const ellipseVertices = Vertices.fromPath(generateEllipsePath(width / 2, height / 2, 20));

                const newBody = Bodies.fromVertices(
                    obj.x + this.nextChunkX,
                    obj.y,
                    [ellipseVertices],
                    { label: 'item' },
                    true
                );

                item.setExistingBody(newBody);
                item.setPosition(obj.x + this.nextChunkX + width/2, obj.y +height/2);
                item.setMass(0.1); // 非常に軽い質量に設定

                const gravityIgnore = getProp(obj, 'gravityIgnore', false);
                item.setIgnoreGravity(gravityIgnore);

                item.setFixedRotation();
                
                item.chunkIndex = this.currentChunkIndex;

                this.items.push(item);
            });
        }
    }

    onItemPickup(player, item) {
        const itemName = item.texture.key;
        switch (itemName) {
            case 'coin_bronze':
                console.log('Coin!')
                break;
        }
        item.setActive(false);
        item.setVisible(false);

        if (item.body) {
            this.scene.matter.world.remove(item.body);
            // item.body = null;
        }
        this.itemPool.add(item);
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
        let layer = this.layerPool.getFirstDead(false);
        if (!layer) {
            layer = safeCreateLayer(chunkMap, name, tilesets, this.nextChunkX, 0);
            this.layerPool.add(layer);  // プールに追加
        }
        return layer;
    }

    manageLayerPool(typeNum) {
        let returnCount = typeNum * 3;
        if (this.addedChunks.length < returnCount) return;

        for (let i = 0; i < typeNum; i++) {
            const oldLayer = this.addedChunks.shift();
            if (oldLayer) {
                oldLayer.setVisible(false);
                this.layerPool.add(oldLayer);  // プールに戻す
            }
        }
    }

    resetMap(exBodies = []) {
        const Matter = Phaser.Physics.Matter.Matter;
        const world = this.scene.matter.world.localWorld;

        const allBodies = Matter.Composite.allBodies(world);

        allBodies.forEach((body) => {
            // if (body.label === 'enemy' || body.label === 'item' || body.label === 'player') return;
            if (exBodies.indexOf(body) === -1) {
                Matter.World.remove(world, body);
            }
        });

        // すべて非表示にしてプールに戻す
        this.addedChunks.forEach(layer => {
            layer.setVisible(false);  // レイヤーを非表示にする
            this.layerPool.add(layer);  // プールに戻す
        });
        this.addedChunks = [];  // 配列を空にして、次のチャンク追加に備える  
        // すべて非表示にしてプールに戻す
        this.enemies.forEach(enemy => {
            enemy.setVisible(false);  // レイヤーを非表示にする
            this.enemyPool.add(enemy);  // プールに戻す
        });
        this.enemies = [];  // 配列を空にして、次のチャンク追加に備える  
        // すべて非表示にしてプールに戻す
        this.items.forEach(item => {
            item.setVisible(false);  // レイヤーを非表示にする
            this.itemPool.add(item);  // プールに戻す
        });
        this.items = [];  // 配列を空にして、次のチャンク追加に備える        

        this.nextChunkX = 0;
        this.chunkWidth = 0;
        // this.addNextChunk();
        this.currentChunkIndex = 0;
    }
    
    createBackgrounds() {
        this.backgroundLayers = {
            sky: this.scene.add.image(0, 0, 'sky')
                .setOrigin(0, 0)
                .setDisplaySize(this.scene.game.config.width, this.scene.game.config.height)
                .setDepth(-7)
                .setScrollFactor(0)
        };
    
        const width = this.scene.game.config.width;
        const height = this.scene.game.config.height;
    
        const layerConfigs = [
            { key: 'mountain', depth: -6, parallaxFactor: 0.2 },
            { key: 'mountains', depth: -5, parallaxFactor: 0.4 },
            { key: 'mountain-trees', depth: -4, parallaxFactor: 0.6 },
            { key: 'trees', depth: -3, parallaxFactor: 0.8 }
        ];
    
        this.parallaxLayers = [];
    
        for (const config of layerConfigs) {
            const layerPair = [];
    
            for (let i = 0; i < 4; i++) {
                const image = this.scene.add.image(i * width, 0, config.key)
                    .setOrigin(0, 0)
                    .setDisplaySize(width, height)
                    .setDepth(config.depth)
                    .setScrollFactor(config.parallaxFactor, 0);  // x方向のみ動く
    
                layerPair.push(image);
            }
    
            this.parallaxLayers.push({
                images: layerPair,
                parallaxFactor: config.parallaxFactor,
                width: width
            });
        }
    }
    updateBackgrounds() {
        const cameraX = this.scene.cameras.main.scrollX;
    
        for (const layer of this.parallaxLayers) {
            for (const image of layer.images) {
                // パララックス位置に合わせる
                image.x = Math.floor(image.x);
    
                const relX = cameraX * layer.parallaxFactor;
                const offsetX = relX % layer.width;
    
                // 背景を左から右に無限ループさせる
                if (image.x + layer.width < cameraX - layer.width) {
                    image.x += layer.width * 4;
                }
            }
        }
    } 
}

// 複数タイルセット対応
function safeCreateLayer(map, name, tilesets, x, y) {
    const layerData = map.layers.find(layer => layer.name === name);
    if (!layerData) return null;

    for (let tileset of tilesets) {
        const layer = map.createLayer(name, tileset, x, y);
        if (layer) return layer;
    }
    return null;
}
// プロパティ取得
function getProp(obj, name, defaultValue) {
    return obj.properties?.find(p => p.name === name)?.value ?? defaultValue;
}
