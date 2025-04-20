$(document).ready(function(){
    // サイズ取得
    const $container = $('#game-container');
    const width = $container.width();
    const height = $container.height();

    // Phaserゲームの設定
    const config = {
        type: Phaser.AUTO,
        width: width,
        height: height,
        physics: {
            default: 'arcade',
            arcade: { gravity: { y: 1000 }, debug: false }
        },
        parent: 'game-container', // ここで表示先を指定
        scene: {
            preload,
            create,
        }
    };

    // ゲームインスタンスの作成
    const game = new Phaser.Game(config);
    checkGameSize(game);
    
    let wheel;
    let isSpinning = false;

    function preload() {
        this.load.image('wheel', 'https://labs.phaser.io/assets/sprites/wheel.png'); // 好きな画像に差し替えOK
        this.load.image('pin', 'https://labs.phaser.io/assets/sprites/pin.png');
    }

    function create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        wheel = this.add.sprite(centerX, centerY, 'wheel');
        const pin = this.add.sprite(centerX, centerY - 200, 'pin');

        this.input.on('pointerdown', spinWheel, this);
    }

    function spinWheel() {
        if (isSpinning) return;
        isSpinning = true;

        const rounds = Phaser.Math.Between(3, 6); // 3〜6周
        const finalAngle = Phaser.Math.Between(0, 360); // 最後の角度

        const totalAngle = 360 * rounds + finalAngle;

        this.tweens.add({
            targets: wheel,
            angle: totalAngle,
            duration: 4000,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                isSpinning = false;
                const result = getResultFromAngle(wheel.angle);
                console.log('止まったセクター:', result);
            }
        });
    }

    // 止まった角度から結果を出す（例えば 8分割なら45度ずつ）
    function getResultFromAngle(angle) {
        const normalized = angle % 360;
        const sectorSize = 360 / 8; // 8セクターに分けた場合
        const sectorIndex = Math.floor((360 - normalized) / sectorSize) % 8;
        return sectorIndex;
    }

});