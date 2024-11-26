function zoom_image(imageUrl) {
    const $modalImage = $('#modalImage');

    $modalImage.attr('src', imageUrl);  // 画像URLを設定
    $('#imageModalContainer').modal('show');  // Bootstrapのモーダルを表示
}

document.addEventListener('DOMContentLoaded', function() {
    $('#imageModalContainer .modal-body').on('click', function() {
        $('#imageModalContainer').modal('hide');
    });
});