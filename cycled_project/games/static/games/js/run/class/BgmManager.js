// BgmManager.js
export default class BgmManager {
    constructor(scene, options) {
        this.scene = scene;
        this.currentBgm = null;
        this.currentKey = null;
        this.options = options;

        // 🔽 BGMごとの基準音量を定義（必要に応じて調整）
        this.volumeTable = {
            bgmDrops: 0.5,
            bgmRunning: 0.5,
            bgmGameOver: 0.5,
        };
    }

    play(key, overrideVolume = null, config = { loop: true }) {
        const baseVolume = this.volumeTable[key] ?? 1.0;
        const rawVolume = overrideVolume ?? baseVolume;

        // すでに同じBGMが再生中ならスキップ
        if (this.currentKey === key && this.currentBgm?.isPlaying) {
            return;
        }
    
        // 別のBGMが再生中なら停止
        if (this.currentBgm && this.currentBgm.isPlaying) {
            this.currentBgm.stop();
        }
    
        // BGMを新しく再生
        this.currentBgm = this.scene.sound.add(key, {
            ...config,
            volume: this.options.get(rawVolume,'BGM'),    // 音量調節
        });
    
        this.currentBgm.play();
        this.currentKey = key;
    }    

    stop() {
        if (this.currentBgm) {
            this.currentBgm.stop();
            this.currentKey = null;
            this.currentBgm = null;
        }
    }

    pause() {
        if (this.currentBgm && this.currentBgm.isPlaying) {
            this.currentBgm.pause();
        }
    }

    resume() {
        if (this.currentBgm && this.currentBgm.isPaused) {
            this.currentBgm.resume();
        }
    }

    isPlaying() {
        return this.currentBgm && this.currentBgm.isPlaying;
    }

    setVolume(volume) {
        if (this.currentBgm) {
            this.currentBgm.setVolume(volume);
        }
    }

    // 速度変更
    setRate(rate) {
        if (this.currentBgm) {
            this.currentBgm.setRate(rate);
        }
    }    
}
