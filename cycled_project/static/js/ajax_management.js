$(document).ready(function() {
    // AJAX リクエスト開始時に処理を実行
    $(this).ajaxStart(function() {
        start_loading();  // ローディングインジケーターを表示
    });

    // AJAX リクエストが完了した時に処理を実行
    $(this).ajaxStop(function() {
        check_errors();  // エラーがあればモーダルを表示
        remove_loading();  // ローディングインジケーターを非表示
    });
});