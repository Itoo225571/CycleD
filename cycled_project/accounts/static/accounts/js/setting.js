$(document).ready(function() {
    // ユーザー名の入力フィールドと送信ボタンを取得
    const $usernameField = $('[name="username"]'); // ユーザー名の入力フィールド
    const $submitButtonUsername = $('#form-username');  // ボタンのID
    // Enterキーが押されたときにボタンをクリックするようにする
    $usernameField.on('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();  // デフォルトの送信を防止
            $submitButtonUsername.click();    // ボタンをクリックする
        }
    });

    // emailの入力フィールドと送信ボタンを取得
    const $emailField = $('[name="email"]'); // ユーザー名の入力フィールド
    const $submitButtonEmail = $('#form-email');  // ボタンのID
    // Enterキーが押されたときにボタンをクリックするようにする
    $emailField.on('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();  // デフォルトの送信を防止
            $submitButtonEmail.click();    // ボタンをクリックする
        }
    });
    // 全日記を削除する
    $('.button-delete-all-diaries').off('click').on('click',function(e) {
        e.preventDefault();
        var url = $(this).data('url')
        deleteAllDiaries(url);
    });
});

function resetAllEditButtons() {
    // .userinformation-field 内のすべての .form-control と submit ボタンを非表示にする
    $('.userinformation-field').each(function() {
        $(this).find('.form-control').addClass('d-none').hide();
        $(this).find('button[type="submit"]').addClass('d-none').hide();
        
        // .userinformation-field 内のすべての .user-info を表示する
        $(this).find('.user-info').show();
        
        // .userinformation-field 内のすべての .user-edit-button を表示する
        $(this).find('.user-edit-button').show();
    });
}
function toEdit(button) {
    resetAllEditButtons();  // 一旦全て編集不可にする
    // 一番近くの .user-info と このボタン自体 を非表示にする
    var $row = $(button).closest('tr');
    $row.find('.user-info').hide();
    $(button).hide();

    // 一番近くの .form-control と type="submit" ボタンを表示する
    $row.find('.form-control').removeClass('d-none').show();
    $row.find('button[type="submit"]').removeClass('d-none').show();
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