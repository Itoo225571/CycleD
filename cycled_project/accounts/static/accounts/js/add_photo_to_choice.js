$(document).ready(function() {
    $modal = $('#usericonModal');

    // モーダル内でname="icon"の要素を選択
    $modal.find('[name="icon"]').each(function() {
        // 現在のラジオボタンに関連する<label>要素を取得
        var $label = $(this).closest('label');
        
        // 画像を表示する<img>タグを追加
        var imageUrl = $(this).val();  // 現在選択されているラジオボタンの値（画像URL）
        var imgTag = $('<img>').attr('src', imageUrl).css({
            width: '50px',  // 画像のサイズ調整
            height: '50px',
            borderRadius: '50%',  // 円形にする場合
            marginBottom: '5px'  // テキストとの間隔
        });
        
        // <img>タグを<label>の後ろに追加
        $label.append(imgTag);
    });
    // ラジオボタンの選択が変更されたときの処理
    $modal.find('[name="icon"]').on('change', function() {
        var selectedValue = $(this).val();  // 選択されたラジオボタンの値
        // console.log('選択されたアイコンの画像URL: ' + selectedValue);
    });

});