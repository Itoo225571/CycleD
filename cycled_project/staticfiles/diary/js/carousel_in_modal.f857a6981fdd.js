$(document).ready(function () {
    var $carousel = $('.carousel');
    var $carouselItems = $carousel.find('.carousel-item');
    var $titleElement = $carousel.find('.modal-header .modal-title');

    const $nextBtn = $('#carouselNextBtn');
    const $prevBtn = $('#carouselPrevBtn');
    const $closeBtn = $('#carouselCloseBtn');

    // 最初にタイトルを更新
    $titleElement.text($carouselItems.first().data('bs-title'));
    $prevBtn.prop('disabled', true); // 初めにPrevボタンを無効化

    // スライドが変わるたびにタイトルを変更
    $carousel.on('slid.bs.carousel', function (event) {
        var $activeItem = $(event.relatedTarget); // 次に表示されるスライド
        var title = $activeItem.data('bs-title');
        $titleElement.text(title);

        // 最後のスライドの場合，閉じるボタンを表示
        const $items = $carousel.find('.carousel-item');
        const activeIndex = $items.index($carousel.find('.carousel-item.active'));
        
        // 最後のスライドなら「閉じる」ボタンに変更
        if (activeIndex === $items.length - 1) {
            $nextBtn.hide();
            $closeBtn.show();
        } else {
            // それ以外は「次へ」に戻す
            $nextBtn.show();
            $closeBtn.hide();  
        }
        // 最初のスライドなら戻るを無効化
        if (activeIndex === 0) {
            $prevBtn.prop('disabled', true);
        } else {
            $prevBtn.prop('disabled', false);
        }
    });

    // 閉じるボタンでモーダルを閉じたときにカルーセルをリセット
    $closeBtn.on('click', function () {
        var carouselInstance = bootstrap.Carousel.getInstance($carousel[0]);
        if (carouselInstance) {
            carouselInstance.to(0); // 最初のスライドに戻す
        }
        // タイトルもリセット（モーダルが再度開かれたとき用）
        $titleElement.text($carouselItems.first().data('bs-title'));
    });
});
