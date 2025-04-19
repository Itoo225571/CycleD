function checkGame(game) {
    const $game_container = $('#game-container');
    const $lock = $('#orientation-lock');
    const GAME_WIDTH_MIN = 640;

    const checkOrientation = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (width < height && isMobile() && width < GAME_WIDTH_MIN) {
            $lock.show();
            $game_container.hide();

            game.scene.pause();  // ゲームをポーズ
        } else {
            $lock.hide();
            $game_container.show();

            game.scene.resume(); // ゲームを再開
        }
    };

    // 初回
    checkOrientation();

    // リサイズや向き変化で再実行
    $(window).on('resize orientationchange', function () {
        checkOrientation();
    });

    // モバイル判定関数
    function isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }
}


