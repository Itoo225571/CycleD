function logout(url_logout) {
    if (confirm('ログアウトしますか？')) {
        $.ajax({
            url: url_logout,  // AJAXで送信するURL
            type: 'POST',  // POSTリクエスト
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            success: function(response) {
                if (response && response.status === 'success') {
                    window.location.href = '/';  // ログアウト後のリダイレクト先
                } else {
                    alert('ログアウトに失敗しました');
                }
            },
            error: function(xhr, errmsg, err) {
                alert('エラーが発生しました。再度お試しください。');
            }
        });     
    }    
}

function deleteAllDiaries(url_deleteAllDiaries) {
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
}

function confirmDelete() {
    // 確認ダイアログを表示
    if (confirm("本当に退会しますか？")) {
        if (confirm("本当に？")) {
            if (confirm("後悔しない？")) {
                // ユーザーが「OK」を押した場合、フォームを送信
                $('#delete-user-form').submit();
            }
        }
    }
}