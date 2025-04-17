$(document).ready(function() {
    const $card_container = $('.card-flip-container');
    
    $card_container.on('click', function () {
        const $flip_trigger = $(this).find('.card-flip');
        const flipClass = $flip_trigger.data('flip-class');
        
        if (flipClass) {
            if ($flip_trigger.hasClass('is-flipped')) {
                // カードが裏面の場合、逆回転のアニメーションを追加
                $flip_trigger.removeClass(flipClass); // まず前のアニメーションを削除
                $flip_trigger.addClass(flipClass + '-reverse'); // 逆回転のクラスを追加
            } else {
                // カードが表面の場合、通常の回転アニメーションを適用
                $flip_trigger.removeClass(flipClass + '-reverse');
                $flip_trigger.addClass(flipClass);
            }
        }
        
        $flip_trigger.toggleClass('is-flipped');
    });

    const $flips = $card_container.find('.card-flip');
    $flips.each(function () {
        const $flip = $(this);
        const $front = $flip.find('.card-front');
        const $back = $flip.find('.card-back');

        // 一時的に back を表示して高さ取得
        $back.css({ position: 'static', visibility: 'hidden', display: 'block' });

        const frontHeight = $front[0].scrollHeight;
        const backHeight = $back[0].scrollHeight;

        const maxHeight = Math.max(frontHeight, backHeight);

        // 高さを設定
        $flip.height(maxHeight);
        $front.height(maxHeight);
        $back.height(maxHeight);

        // 元に戻す
        $back.css({ position: '', visibility: '', display: '' });
    });
});
