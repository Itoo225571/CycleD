function isFullscreen() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
}

function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function resize(game) {
    const $game_container = $('#game-container');
    const $canvas = $('canvas');

    $game_container.removeClass('full-screen-container');
    if (isMobile()) {
        $game_container.addClass('full-screen-container');
    }

    const containerWidth = $game_container.width();
    const containerHeight = $game_container.height();
    const containerRatio = containerWidth / containerHeight;
    const gameRatio = game.config.width / game.config.height;

    let newWidth, newHeight;

    if (isFullscreen()) {
        if (containerRatio < gameRatio) {
            newWidth = containerWidth;
            newHeight = containerWidth / gameRatio;
        } else {
            newHeight = containerHeight;
            newWidth = containerHeight * gameRatio;
        }
    } else {
        const maxWidth = 800;
        const maxHeight = 450;

        if (containerRatio < gameRatio) {
            newWidth = Math.min(containerWidth, maxWidth);
            newHeight = newWidth / gameRatio;
        } else {
            newHeight = Math.min(containerHeight, maxHeight);
            newWidth = newHeight * gameRatio;
        }
    }

    const marginLeft = (containerWidth - newWidth) / 2;
    const marginTop = (containerHeight - newHeight) / 2;

    $canvas.css({
        width: newWidth + "px",
        height: newHeight + "px",
        marginLeft: marginLeft + "px",
        marginTop: marginTop + "px"
    });

    $game_container.show();

    if (game && game.scene && game.scene.isPaused()) {
        game.scene.resume();
    }
}
