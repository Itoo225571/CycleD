export class PlayerOptions {
    constructor(data) {
        this.masterVolume = data.masterVolume ?? 1.0;
        this.bgmVolume = data.bgmVolume ?? 1.0;
        this.sfxVolume = data.sfxVolume ?? 1.0;
        this.fullscreen = data.fullscreen ?? false;
    }

    get(volume, type) {
        let v = 1.0;
        if (type.toUpperCase() === 'BGM') {
            v = this.bgmVolume;
        } else if (type.toUpperCase() === 'SFX') {
            v = this.sfxVolume;
        }
        const finalVolume = Phaser.Math.Clamp(
            volume * this.masterVolume * v,
            0, 1
        );
        return finalVolume;
    }

    update(options, scene) {
        if (!options) return;
        if (typeof options.masterVolume === 'number') {
            this.masterVolume = Phaser.Math.Clamp(options.masterVolume, 0, 1);
        }
        if (typeof options.bgmVolume === 'number') {
            this.bgmVolume = Phaser.Math.Clamp(options.bgmVolume, 0, 1);
        }
        if (typeof options.sfxVolume === 'number') {
            this.sfxVolume = Phaser.Math.Clamp(options.sfxVolume, 0, 1);
        }
        if (typeof options.fullscreen === 'boolean') {
            this.fullscreen = options.fullscreen;
        }
        
        this.save(scene);   // 変更をセーブ
    }
    

    save(scene) {
        const userInfo = this.registry.get('userInfo');
        const id = userInfo.id;

        const data = {
            masterVolume: this.masterVolume,
            bgmVolume: this.bgmVolume,
            sfxVolume: this.sfxVolume,
            fullscreen: this.fullscreen
        };
        $.ajax({
            url: `/games/api/nikirun_userinfo/${id}/`,
            type: 'PATCH',
            contentType: 'application/json',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            data: JSON.stringify({ 
                options: data,
            }),
            success: () => {
                return;
            },
            error: () => {
                createPopupWindow(scene, {
                    x: scene.game.config.width / 2,  // 画面の中央X座標
                    y: scene.game.config.height / 2, // 画面の中央Y座標
                    width: scene.game.config.height * 2/3 * 1.618,
                    height: scene.game.config.height * 2/3,
                    header: 'Error',
                    message: '通信エラーが発生しました' ,
                });
                return;
            },
        });
    }
}
