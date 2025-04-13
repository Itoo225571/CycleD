$(document).ready(function () {
    var $carousel = $('.carousel');
    var $carouselItems = $carousel.find('.carousel-item');
    var $titleElement = $('.modal-header .modal-title');

    // 最初にタイトルを更新
    $titleElement.text($carouselItems.first().data('bs-title'));

    // スライドが変わるたびにタイトルを変更
    $carousel.on('slid.bs.carousel', function (event) {
        var $activeItem = $(event.relatedTarget); // 次に表示されるスライド
        var title = $activeItem.data('bs-title');
        $titleElement.text(title);
    });
});
