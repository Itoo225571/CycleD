$(document).ready(function() {
    $('form').on('submit', function(e) {
        e.preventDefault();  // デフォルトのフォーム送信を防ぐ
        if (!confirm('ほんまに退会しますか？')) {
            // キャンセルした場合、処理を中止
            return;  // ここで処理を中断
        }
        // 退会処理を実行するコード（確認ダイアログで「OK」が押された場合）
        this.submit();  // フォームを実際に送信
    });
});
