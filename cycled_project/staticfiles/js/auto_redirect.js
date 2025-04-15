$(document).ready(function() {
    const $box = $('.auto-redirect');
    const redirect_url = $box.data('redirect-url'); // リダイレクト先の値を取得
    let count = $box.data('redirect-count');  // 猶予
    $box.find('.countdown-text').text(count);

    if (redirect_url && count) {
        count--;
        const intervalId = setInterval(function() {
            if (count > 0) {
                $box.find('.countdown-text').text(count);
                count--;
            } else {
              clearInterval(intervalId); // カウントが終わったら止める
              $('.countdown-text').text('移動します...');
              // ここでリダイレクトしてもOK
              window.location.href = redirect_url;
            }
        }, 1000); // 1000ms = 1秒ごと
    }
});