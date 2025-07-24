export default class SfxManager {
    constructor(scene, options) {
        this.scene = scene;
        this.activeSFX = [];
        this.options = options;

        // 🔽 SFXごとの基準音量を定義（必要に応じて調整）
        this.volumeTable = {
            jumpSound: 0.4,
            stompSound: 1.0,
            damageSound: 1.0,
            fallingSound: 1.0,
            alarmSound: 1.0,
            coinSound: 0.8,
            impactSound: 1.0,
            buttonSoftSound: 1.1,
            buttonHardSound: 1.0,
            pauseSound: 1.0,
            selectedSound: 0.8,
        };
    }

    play(key, options = {}) {
        const baseVolume = this.volumeTable[key] ?? 1.0;
        const rawVolume = options.volume ?? baseVolume;
    
        const sfxVolume = this.options.get(rawVolume, 'SFX');
    
        const sound = this.scene.sound.add(key);
        sound.play({
            ...options,
            volume: sfxVolume,  // masterVolume × sfxVolume × baseVolume
        });
    
        this.activeSFX.push(sound);
    
        sound.once('complete', () => {
            this.activeSFX = this.activeSFX.filter(s => s !== sound);
            sound.destroy();
        });
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