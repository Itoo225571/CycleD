export function checkGameSize(game) {
    const $game_container = $('#game-container');
    const $lock = $('#orientation-lock');
    const $canvas = $("canvas");

    // モバイル判定関数
    function isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    function resize() {
        $game_container.removeClass('full-screen-container');  //一旦取り外す
        if (isMobile()) {
            let windowWidth = $(window).width();
            let windowHeight = $(window).height();
            // 縦長 && モバイル の場合はロック表示＋ゲーム非表示
            if (windowHeight > windowWidth) {
                $lock.show();
                $game_container.hide();
                if (game && game.scene && game.scene.getScene('PlayScene')) {
                    game.scene.getScene('PlayScene').pauseGame();
                }                
                return;
            } else {
                $game_container.addClass('full-screen-container');     //フルスクリーン表示用のクラス
            }
        }

        let containerWidth = $game_container.width();
        let containerHeight = $game_container.height();
        let containerRatio = containerWidth / containerHeight;
        let gameRatio = game.config.width / game.config.height;
        // サイズ調整: コンテナから溢れないように
        if (containerRatio < gameRatio) {
            $canvas.css({
                width: containerWidth + "px",
                height: (containerWidth / gameRatio) + "px"
            });
        } else {
            $canvas.css({
                width: (containerHeight * gameRatio) + "px",
                height: containerHeight + "px"
            });
        }

        $lock.hide();
        $game_container.show();
        
        if (game && game.scene && game.scene.isPaused()) {
            game.scene.resume();
        }
    }
    resize();
    $(window).on('resize',resize);
}
