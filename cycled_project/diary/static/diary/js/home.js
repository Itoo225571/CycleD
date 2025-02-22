function zoom_image(imageUrl,angle) {
    const $modalImage = $('#modalImage');

    $modalImage.attr('src', imageUrl);  // 画像URLを設定
    $('.modal-body').css('transform', `rotate(${angle}deg)`);
    $('#imageModalContainer').modal('show');  // Bootstrapのモーダルを表示
}

$(document).ready(function() {
    $('.card').each(function(index, card) {
        adjust_imgs($(card),'max');
    });
    $('#imageModalContainer .modal-content').on('click', function() {
        $('#imageModalContainer').modal('hide');
    });
});
