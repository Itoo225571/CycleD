$(document).ready(function() {
    $('#delete-all-diaries').on('click', function() {
        // 確認ダイアログを表示
        if (confirm("本当にすべての日記を削除しますか？")) {
            // AJAXリクエストを送信
            $.ajax({
                url: url_deleteAllDiaries,
                type: 'POST',
                headers: {
                    "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンも必要な場合
                },
                data: {},
                success: function(response) {
                    if (response.status === 'success') {
                        alert(response.message);
                    } else {
                        alert(response.message);
                    }
                },
                error: function(xhr, errmsg, err) {
                    alert('エラーが発生しました。再度お試しください。');
                }
            });
        }
    });
});