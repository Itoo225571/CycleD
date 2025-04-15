$(document).ready(function() {
    const $modal = $('#usericonModal');
    var class_not_checked = 'border-transparent';
    var class_checked = 'border-primary';

    // ラジオボタンの選択が変更されたときの処理
    $modal.find('[name="icon"]').on('change', function() {
        // 画像全てから .border と .border-primary を削除
        $modal.find('.icon-img-radio').removeClass(class_checked).addClass(class_not_checked);

        var selectedImg = $(this).closest('label').find('img');
        // 一致する画像に .border .border-primary を追加
        selectedImg.removeClass(class_not_checked).addClass(class_checked);
    });

    // ページ読み込み時に選択状態を反映
    var checkedRadio = $modal.find('[name="icon"]:checked');
    if (checkedRadio.length > 0) {
        var selectedImg = checkedRadio.closest('label').find('img');
        selectedImg.removeClass(class_not_checked).addClass(class_checked);
    }

});