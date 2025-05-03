import { gameOptions } from '../config.js';

export default class MapManager {
    constructor(scene, tilesetKey) {
        this.scene = scene;
        this.tilesetKey = tilesetKey;
        this.chunkWidth = 0;
        this.nextChunkX = 0;
        this.chunks = gameOptions.chunks;
        this.addedChunks = [];
        this.layerPool = [];
        this.collisionTiles = [];
    }

    addNextChunk() {
        const randomIndex = Math.floor(Math.random() * this.chunks.length);
        const chunkKey = this.nextChunkX === 0 ? gameOptions.startChunk : this.chunks[randomIndex];
        const chunkMap = this.scene.make.tilemap({ key: chunkKey });

        const tileset = chunkMap.addTilesetImage(gameOptions.tileName, this.tilesetKey);

        // レイヤーの作成（背景や装飾はそのまま）
        this.backgroundLayer = this.getLayerFromPool(chunkMap, 'Background', tileset).setDepth(-2);
        this.decoLayer = this.getLayerFromPool(chunkMap, 'Deco', tileset).setDepth(-1);
        this.itemLayer = this.getLayerFromPool(chunkMap, 'Item', tileset).setDepth(0);
        this.enemyLayer = this.getLayerFromPool(chunkMap, 'Enemy', tileset).setDepth(1);

        // Matter 対応：コリジョンレイヤーの作成
        this.groundLayer = safeCreateLayer(chunkMap, 'Ground', tileset, this.nextChunkX, 0).setDepth(2);
        this.blockLayer = safeCreateLayer(chunkMap, 'Block', tileset, this.nextChunkX, 0).setDepth(3);

        this.convertLayerToMatterBodies(this.groundLayer,'ground');
        if (this.blockLayer) {
            this.convertLayerToMatterBodies(this.blockLayer,'block');
        }

        this.chunkWidth = chunkMap.widthInPixels;
        this.nextChunkX += this.chunkWidth;

        this.addedChunks.push(this.backgroundLayer, this.decoLayer, this.groundLayer, this.blockLayer, this.itemLayer, this.enemyLayer);
        this.manageLayerPool(6);
    }

    convertLayerToMatterBodies = (layer, label) => {
        if (!layer) return;
    
        layer.setCollisionByProperty({ collides: true });
    
        // タイルレイヤーをMatterボディに変換
        this.scene.matter.world.convertTilemapLayer(layer);
    
        // タイルごとの処理
        layer.forEachTile(tile => {
            if (tile.properties.collides) {
                // 物理ボディを追加
                const matterBody = tile.physics.matterBody.body;
                this.collisionTiles.push(matterBody);
            }
        });
    };
    

    getLayerFromPool(chunkMap, name, tileset) {
        let layer = this.layerPool.find(layer => layer.name === name && !layer.visible);
        if (!layer) {
            layer = safeCreateLayer(chunkMap, name, tileset, this.nextChunkX, 0);
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

function safeCreateLayer(map, name, tileset, x, y) {
    const layerData = map.layers.find(layer => layer.name === name);
    if (layerData) {
        return map.createLayer(name, tileset, x, y);
    }
    return null;
}
