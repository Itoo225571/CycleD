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
    $('#imageModalContainer .modal-content').off('click').on('click', function() {
        $('#imageModalContainer').modal('hide');
    });

    // Bootstrapのタブが切り替わる際に発火するイベント
    $('.diary-list-field .nav-item').off('click').on('click', function() {
        $('.card-thumbnail').each(function(index, thumbnail) {
            adjust_imgs($(thumbnail),'max');
        });
    });

    $('.toggle-diary-good').off('click').on('click', function() {
        const $button = $(this);
        const $icon = $button.find(".icon-liked");
        const liked = $icon.data('liked');
        const url = $button.data("url");
        
        $icon.data("liked", !liked);  // likedを反転

        $.ajax({
            url: url,
            type: 'POST',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンも必要な場合
            },
            success: function(response) {
                if (response.status === 'success') {
                    $icon.attr("data-liked", response.liked.toString()); //data-likedを更新
                } else {
                    console.error("エラー:", data.message);
                    $icon.data("liked", liked);  // 元のliked状態に戻す
                }
            },
            error: function(xhr, errmsg, error) {
                console.error("通信エラー:", error);
                alert('通信エラーが発生しました。再度お試しください。');
                $icon.data("liked", originalLiked);  // 元のliked状態に戻す
            }
        });
    });
});
