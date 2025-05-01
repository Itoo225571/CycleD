import { gameOptions } from '../config.js';

export default class MapManager {
    constructor(scene, tilesetKey) {
        this.scene = scene;
        this.tilesetKey = tilesetKey;
        this.chunkWidth = 0;
        this.nextChunkX = 0;
        this.chunks = gameOptions.chunks; // 順に使う or ランダムに使う
        this.addedChunks = [];

        // レイヤー用のオブジェクトプールを作成
        this.layerPool = [];
    }

    addNextChunk() {
        const randomIndex = Math.floor(Math.random() * this.chunks.length);
        const chunkKey = this.nextChunkX === 0 ? gameOptions.startChunk : this.chunks[randomIndex];
        const chunkMap = this.scene.make.tilemap({ key: chunkKey });

        const tileset = chunkMap.addTilesetImage(gameOptions.tileName, this.tilesetKey);
        
        // プールからレイヤーを取得または新規作成
        this.groundLayer = this.getLayerFromPool(chunkMap, 'Ground', tileset);
        this.backgroundLayer = this.getLayerFromPool(chunkMap, 'Background', tileset);
        this.decoLayer = this.getLayerFromPool(chunkMap, 'Deco', tileset);

        this.groundLayer.setCollisionByProperty({ collides: true });
        this.groundLayer.setCollisionByExclusion([-1]);

        this.chunkWidth = chunkMap.widthInPixels;
        this.nextChunkX += this.chunkWidth;

        // レイヤーをプールに追加
        this.addedChunks.push(this.groundLayer, this.backgroundLayer, this.decoLayer);
        this.manageLayerPool(3);
    }

    getLayerFromPool(chunkMap, name, tileset) {
        // プールからレイヤーを取得
        let layer = this.layerPool.find(layer => layer.name === name && !layer.visible);
        if (!layer) {
            // プールにレイヤーがなければ新たに作成
            layer = safeCreateLayer(chunkMap, name, tileset, this.nextChunkX, 0);
        }
        return layer;
    }
    manageLayerPool(typeNum) {
        let returnCount = typeNum * 3;
        if(this.addedChunks.length < returnCount) return;   //種類数x2以上で発動

        for (let i = 0; i < typeNum; i++) {
            const oldLayer = this.addedChunks.shift(); // 配列から最初のレイヤーを削除
            if (oldLayer) {
                oldLayer.setVisible(false); // レイヤーを非表示に
                this.layerPool.push(oldLayer); // プールに戻す

            }
        }
    }

    resetMap() {
        if (this.addedChunks && this.addedChunks.length > 0) {
            this.addedChunks.forEach(layer => {
                if (layer) {
                    layer.setVisible(false); // 非表示にしてプールに戻す
                    this.layerPool.push(layer); // プールに戻す
                }
            });
        }
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