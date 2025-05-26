import { gameOptions,CATEGORY } from '../config.js';

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
        this.enemies = [];  
        this.enemyPool = this.scene.add.group();  // Phaser Group に変更
        this.items = [];
        this.itemPool = this.scene.add.group();  // Phaser Group に変更
        this.traps = [];
        this.trapPool = this.scene.add.group();  // Phaser Group に変更

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

                if ((this.isTrap(spriteA) && bodyB.label === 'player') || (this.isTrap(spriteB) && bodyA.label === 'player')) {
                    const trap = this.isTrap(spriteA) ? spriteA : spriteB;
                    const player = bodyA.label === 'player' ? spriteA : spriteB;
                    this.onTrap(player, trap);
                }
            });
        });
    }

    addNextChunk() {
        let availableChunks = this.chunks;
        if (this.nextChunkX === 0) {
            var chunkKey = gameOptions.startChunk;  // 最初のチャンクは startChunk を使用
        } else {
            // 前回と同じインデックスを除外
            if (this.lastChunkIndex >= 0 && this.chunks.length > 1) {
                availableChunks = this.chunks.filter((_, index) => index !== this.lastChunkIndex);
            }
    
            const randomIndex = Math.floor(Math.random() * availableChunks.length);
            chunkKey = availableChunks[randomIndex];
    
            // 選んだチャンクのインデックスを元の配列で探して保存
            this.lastChunkIndex = this.chunks.indexOf(chunkKey);
        }
        const chunkMap = this.scene.make.tilemap({ key: chunkKey });

        const tilesets = this.tilesetKeyArray.map(key => {
            return chunkMap.addTilesetImage(key.nameInTiled, key.textureKey);
        });

        this.backgroundLayer = this.getLayerFromPool(chunkMap, 'Background', tilesets)
            .setDepth(-2)
            .setAlpha(0.75); // 透明度を設定

        // this.itemLayer = this.getLayerFromPool(chunkMap, 'Item', tilesets).setDepth(0);

        this.groundLayer = safeCreateLayer(chunkMap, 'Ground', tilesets, this.nextChunkX, 0).setDepth(2);
        this.blockLayer = safeCreateLayer(chunkMap, 'Block', tilesets, this.nextChunkX, 0).setDepth(3);

        this.decoLayer = this.getLayerFromPool(chunkMap, 'Deco', tilesets).setDepth(4);

        this.convertLayerToMatterBodies(this.groundLayer);  // ここで衝突するオブジェクトを設定
        if (this.blockLayer) {
            this.convertLayerToMatterBodies(this.blockLayer);
        }

        this.setEnemies(chunkMap);
        this.setItems(chunkMap);
        this.setTraps(chunkMap);

        this.enemies.forEach(enemy => {
            if (enemy.chunkIndex + 1 < this.currentChunkIndex) {
                this.addObjToPool(enemy);
            }
        });
        this.items.forEach(item => {
            if (item.chunkIndex + 1 < this.currentChunkIndex) {
                this.addObjToPool(item);
            }
        });
        this.traps.forEach(trap => {
            if (trap.chunkIndex + 1 < this.currentChunkIndex) {
                this.addObjToPool(trap);
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
        this.updateObjects(this.items,this.itemPool);
        this.updateObjects(this.traps,this.trapPool);

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
                enemy.name = name;

                // 画像のサイズをオブジェクトのサイズに合わせて変更
                const largerSize = Math.max(width, height);
                const frame = this.scene.textures.get(name).getSourceImage();
                const aspect = frame.width/frame.height;

                let displayWidth, displayHeight;
                if (aspect >= 1) {
                    // 横長画像：横をlargerSizeに合わせる
                    displayWidth = largerSize;
                    displayHeight = largerSize / aspect;
                } else {
                    // 縦長画像：縦をlargerSizeに合わせる
                    displayHeight = largerSize;
                    displayWidth = largerSize * aspect;
                }
                enemy.setDisplaySize(displayWidth, displayHeight);

                // プロパティ
                enemy.speed = getProp(obj, 'speed', 0);
                enemy.direction = getProp(obj, 'direction', 'left');
                enemy.weak = getProp(obj, 'weak', 'none');
                enemy.gravityIgnore = getProp(obj, 'gravityIgnore', false);
                enemy.patrol = getProp(obj, 'patrol', false);
                enemy.range = getProp(obj, 'range', -1);    // -1は無限を表す
                enemy.delay = getProp(obj, 'delay', 0);    // -1は無限を表す

                enemy.delayTimer = null;

                enemy.is_alive = true;  //生きてる

                if (enemy.speed != 0 && (enemy.direction === 'left' || enemy.direction === 'right')) {
                    enemy.play(name + 'Run');
                }
                else {
                    enemy.play(name + 'Idle');
                }

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
                    generateEllipsePath(
                        width / 2, 
                        height/2,
                        20
                    )
                );
                const newBody = Bodies.fromVertices(
                    obj.x + this.nextChunkX,
                    obj.y,
                    [ellipseVertices],
                    { label: 'enemy' },
                    true
                );
                enemy.setExistingBody(newBody);
                enemy.setPosition(
                    obj.x + this.nextChunkX + width/2, 
                    obj.y + height/2,
                );
                enemy.body.friction = 0;
                enemy.body.frictionStatic = 0;
                enemy.body.frictionAir = 0;
                enemy.body.gravityScale = 1;
                enemy.setFixedRotation();
                enemy.setAlpha(1);  //見た目をなおす
                enemy.isMove = false;

                // 重力
                enemy.setIgnoreGravity(enemy.gravityIgnore);

                enemy.chunkIndex = this.currentChunkIndex;

                enemy.originCoord = [obj.x + this.nextChunkX, obj.y];

                enemy.setCollisionCategory(CATEGORY.ENEMY);
                enemy.setCollidesWith(CATEGORY.PLAYER | CATEGORY.WALL | CATEGORY.TRAP);

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
                pool.killAndHide(obj); // 一旦元のを無効化
                obj = this.scene.matter.add.sprite(x, y, name + 'Run');  // 新規作成
                obj.setOrigin(0.5, 1);
                pool.add(obj);
            }            
            obj.setPosition(x, y);
        } else {
            obj = this.scene.matter.add.sprite(x, y, name + 'Run');
            obj.setOrigin(0.5, 1);
            pool.add(obj);
        }
        obj.clearTint();    //色をなおす
        return obj;
    }

    addObjToPool(obj) {
        obj.setActive(false);
        obj.setVisible(false);
    }

    updateEnemies() {
        const cameraLeft = this.scene.cameras.main.scrollX;
        const cameraRight = cameraLeft + this.scene.cameras.main.width;
        const block = gameOptions.oneBlockSize;

        this.enemies.forEach(enemy => {
            if (!enemy.is_alive) return;  // enemyがアクティブでない場合は処理をスキップ

            var margin = block;
            if (enemy.x > cameraRight + margin) {
                enemy.setVelocityX(0);
                enemy.setVelocityY(0);
                return;
            }
            if (enemy.x < cameraLeft) {
                enemy.setVisible(false);  // レイヤーを非表示にする
                this.enemyPool.add(enemy);  // プールに戻す
                enemy.is_alive = false;
                return;
            }

            if (enemy.delay) {
                // delay秒が経過していない場合は処理をスキップ
                if (!enemy.delayTimer) {
                    enemy.delayTimer = this.scene.time.now;  // 現在の時間でtimerを初期化
                }
                if (this.scene.time.now - enemy.delayTimer < enemy.delay * 1000) {
                    return;  // delay秒が経過していなければ何もせず戻る
                }
            }
            // ちょっと力を入れてやる
            if (!enemy.isMove) {
                Phaser.Physics.Matter.Matter.Body.applyForce(enemy.body, enemy.body.position, { x: -0.00001, y: 0 });
                enemy.isMove=true;
            }
            enemy.flipX = false;
            var speed = enemy.speed;
            switch (enemy.direction) {
                case 'left':
                    if (enemy.patrol && enemy.x <= enemy.originCoord[0] - enemy.range * block) {
                        enemy.direction = 'right';
                    }
                    enemy.setVelocityX(-speed);
                    enemy.flipX = false;
                    break;
            
                case 'right':
                    if (enemy.patrol && enemy.x >= enemy.originCoord[0]) {
                        enemy.direction = 'left';
                    }
                    enemy.setVelocityX(speed);
                    enemy.flipX = true;
                    break;
            
                case 'up':
                    if (enemy.patrol && enemy.y <= enemy.originCoord[1] - enemy.range * block) {
                        enemy.direction = 'down';
                    }
                    enemy.setVelocityY(-speed);
                    break;
            
                case 'down':
                    if (enemy.patrol && enemy.y >= enemy.originCoord[1]) {
                        enemy.direction = 'up';
                    }
                    enemy.setVelocityY(speed);
                    break;
            }
        });
    }

    isEnemy(sprite) {
        return this.enemies.includes(sprite);
    }
    isItem(sprite) {
        return this.items.includes(sprite);
    }
    isTrap(sprite) {
        return this.traps.includes(sprite);
    }
    
    onEnemyCollision(player, enemy) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const angle = Math.atan2(dy, dx); // ラジアン

        // 角度から方向を判定（8方向で割り当て）
        let collisionDirection = judgeDirection(angle);

        // enemyの弱点にぶつかった時(踏んだ時)
        if (collisionDirection === enemy.weak) {
            // player.setVelocityY(-player.jumpForce); // 上に弾む（速度を調整）
            player.jump_count = 0;
            player.jump(true);
            enemyDead(enemy);
        } else if (player.invincible) {
            enemyDead(enemy);   // playerが無敵状態
        } else {
            this.scene.loseLife(true);     //ジャンプしながら消滅
        }

        function enemyDead(enemy) {
            enemy.is_alive = false;
            // 敵を消すまたは反応させる場合
            enemy.setAlpha(0.7);
            enemy.play(enemy.name + 'Dead');
            enemy.setVelocityY(-10); // 敵も少し跳ねる（オプション）
            enemy.setCollisionCategory(null);
            enemy.setDepth(10);   //この時だけ最前線で表示
            enemy.setIgnoreGravity(false);      //重力適用
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

                item.setCollisionCategory(CATEGORY.ITEM);
                item.setCollidesWith(CATEGORY.PLAYER | CATEGORY.WALL); // 敵とは衝突させない

                this.items.push(item);
            });
        }
    }
    setTraps(chunkMap) {
        const objectLayer = chunkMap.getObjectLayer('TrapObjects');
        if (objectLayer) {
            objectLayer.objects.forEach(obj => {
                const name = obj.name;
                const width = obj.width;
                const height = obj.height;

                const trap = this.getObjFromPool(this.trapPool, name, obj.x + this.nextChunkX, obj.y);
                trap.chunkX = this.nextChunkX;

                trap.setDisplaySize(width, height);
                const anims = this.scene.anims;
                if (!anims.exists(name)) {
                    console.warn(`Animation '${name}' が見つかりません. トラップをスキップしました.`);
                    return;
                }
                trap.play(name);

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
                    { label: 'trap' },
                    true
                );
                trap.setExistingBody(newBody);
                trap.setPosition(obj.x + this.nextChunkX + width/2, obj.y +height/2);

                const isStatic = getProp(obj, 'static', true);  // 静的か
                trap.setStatic(isStatic); // プレイヤーが乗れるように固定
                // trap.setMass(1); // 静的だけど衝突判定は有効

                trap.body.friction = 0;
                trap.body.frictionStatic = 0;
                trap.body.frictionAir = 0;
                trap.body.gravityScale = 1;

                // const gravityIgnore = getProp(obj, 'gravityIgnore', false);
                // trap.setIgnoreGravity(gravityIgnore);

                // trap.setFixedRotation();
                
                trap.chunkIndex = this.currentChunkIndex;

                trap.setCollisionCategory(CATEGORY.TRAP);
                if (!isStatic) {
                    trap.setCollidesWith(CATEGORY.PLAYER | CATEGORY.WALL | CATEGORY.ENEMY); // enemyにも当たるように
                } else {
                    trap.setCollidesWith(CATEGORY.PLAYER);
                }

                this.traps.push(trap);
            });
        }
    }

    onItemPickup(player, item) {
        const itemName = item.texture.key;
        switch (itemName) {
            case 'coin_bronze':
                player.chargeBar.chargeUp(0.01);
                player.chargeBar.chargeUp(0.5);
                player.coin_bronze += 1;    // bronzeコイン加算
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

    onTrap(player, trap) {
        const trapName = trap.texture.key;
        switch (trapName) {
            case 'SpikeBall':
                if(!player.invincible)   this.scene.loseLife(true);
                break;
        }
    }

    // 画面外処理
    updateObjects(objs,objPool) {
        const cameraLeft = this.scene.cameras.main.scrollX;
        objs.forEach(obj => {
            if (obj.x < cameraLeft) {
                obj.setVisible(false);  // レイヤーを非表示にする
                objPool.add(obj);  // プールに戻す
                return;
            }
        })
    }

    convertLayerToMatterBodies = (layer) => {
        if (!layer) return;        

        layer.setCollisionByProperty({ collides: true });
        this.scene.matter.world.convertTilemapLayer(layer);
        
        layer.forEachTile(tile => {
            if (tile.properties.collides) {
                const matterBody = tile.physics.matterBody?.body;
    
                if (matterBody) {
                    // collisionCategory と collisionMask を設定
                    matterBody.collisionFilter = {
                        category: CATEGORY.WALL,  // 壁カテゴリを設定
                        mask: CATEGORY.PLAYER | CATEGORY.ITEM | CATEGORY.ENEMY | CATEGORY.TRAP,  // 衝突する相手カテゴリ
                    };
    
                    // 衝突する物体をリストに追加
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
        // すべて非表示にしてプールに戻す
        this.traps.forEach(trap => {
            trap.setVisible(false);  // レイヤーを非表示にする
            this.trapPool.add(trap);  // プールに戻す
        });
        this.traps = [];  // 配列を空にして、次のチャンク追加に備える        

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

function judgeDirection(angle) {
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
    return collisionDirection;
}