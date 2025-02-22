function zoom_image(imageUrl,angle) {
    const $modalImage = $('#modalImage');

    $modalImage.attr('src', imageUrl);  // 画像URLを設定
    $('.modal-body').css('transform', `rotate(${angle}deg)`);
    $('#imageModalContainer').modal('show');  // Bootstrapのモーダルを表示
}

$(document).ready(function() {
    $('.card-thumbnail').each(function(index, thumbnail) {
        adjust_imgs($(thumbnail),'max');
    });
    $('#imageModalContainer .modal-content').on('click', function() {
        $('#imageModalContainer').modal('hide');
    });

    // Bootstrapのタブが切り替わる際に発火するイベント
    $('.diary-list-field .nav-item').on('click', function() {
        $('.card-thumbnail').each(function(index, thumbnail) {
            adjust_imgs($(thumbnail),'max');
        });
    });
});
