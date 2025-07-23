// BgmManager.js
export default class BgmManager {
    constructor(scene) {
        this.scene = scene;
        this.currentBgm = null;
        this.currentKey = null;
    }

    play(key, config = { loop: true, volume: 0.5 }) {
        // すでに同じBGMが再生中ならスキップ
        if (this.currentKey === key && this.currentBgm?.isPlaying) {
            return;
        }

        // 別のBGMが再生中なら停止
        if (this.currentBgm && this.currentBgm.isPlaying) {
            this.currentBgm.stop();
        }

        // BGMを新しく再生
        this.currentBgm = this.scene.sound.add(key, config);
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
