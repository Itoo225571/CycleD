import { get_options } from "../config.js";

export default class SfxManager {
    constructor(scene) {
        this.scene = scene;
        this.activeSFX = [];

        // 🔽 SFXごとの基準音量を定義（必要に応じて調整）
        this.volumeTable = {
            jumpSound: 0.4,
            stompSound: 1.2,
            damageSound: 1.0,
            fallingSound: 1.0,
            falling2Sound: 1.0,
            falling3Sound: 1.0,
            alarmSound: 1.0,
            coinSound: 0.6,
            impactSound: 1.0,
            buttonSoftSound: 0.8,
            buttonHardSound: 0.5,
            pauseSound: 1.0,
            selectedSound: 0.8,
            blockSound: 1.0,
            cannonFireSound: 0.7,
        };

        this.sfxCache = {};
        // 事前に Sound オブジェクトを作成
        Object.keys(this.volumeTable).forEach(key => {
            this.sfxCache[key] = this.scene.sound.add(key);
        });
    }

    play(key, options = {}) {
        const baseVolume = this.volumeTable[key] ?? 1.0;
        const rawVolume = options.volume ?? baseVolume;
    
        const playerOptions = get_options();
        const finalVolume = Phaser.Math.Clamp(
            rawVolume * playerOptions.masterVolume * playerOptions.sfxVolume,
            0, 1
        );
    
        const sound = this.sfxCache[key];
    
        if (sound.isPlaying) {
            // 同時再生したい場合はclone
            const clone = this.scene.sound.add(key);
            clone.play({ ...options, volume: finalVolume });
            this.activeSFX.push(clone);
            clone.once('complete', () => {
                this.activeSFX = this.activeSFX.filter(s => s !== clone);
                clone.destroy();
            });
        } else {
            sound.play({ ...options, volume: finalVolume });
        }
    }

    stop(key) {
        this.activeSFX = this.activeSFX.filter(sound => {
            if (sound.key === key) {
                sound.stop();
                sound.destroy();
                return false;  // 配列から除外
            }
            return true;  // 継続
        });
    }    

    stopAll() {
        this.activeSFX.forEach(sfx => sfx.stop());
        this.activeSFX = [];
    }
}