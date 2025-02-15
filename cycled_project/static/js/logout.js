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