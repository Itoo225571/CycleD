$(document).ready(function() {
    let formDataCommon;  // フォームデータを保存する変数
    
    $('#password-reset-form').on('submit', function(event) {
        event.preventDefault();  // 通常のフォーム送信を防ぐ

        var formData = $(this).serialize();  // フォームデータを取得
        $.ajax({
            url: $(this).attr('action'),
            method: 'POST',
            data: formData,
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            success: function(response) {
                $('.password-reset-field').hide();
                $('.password-reset-done-field').show();
                formDataCommon = formData;
            },
            error: function(xhr, status, error) {
                var response = xhr.responseJSON;
                var errors = response.form.fields;
                $.each(errors,function(_,error) {
                    // 手動でエラーを出力
                    append_error_ajax(error.label,error.errors);
                })
            },
        });
    });
    $('#password-reset-form-re').on('submit', function(event) {
        event.preventDefault();  // 通常のフォーム送信を防ぐ

        if (!formDataCommon) {
            alert('最初のフォームが送信されていません。');
            return;
        }
        var formData = formDataCommon;  // フォームデータを流用
        $.ajax({
            url: $(this).attr('action'),
            method: 'POST',
            data: formData,
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンをヘッダーに設定
            },
            success: function(response) {
                if (response.status == 'success') {
                    $('.password-reset-field').hide();
                    $('.password-reset-done-field').show();
                }
                else alert(response.message);
            },
            error: function(xhr, status, error) {
                var response = xhr.responseJSON;
                console.log(response)
            }
        });
    });
    $('.button-reset').off('click').on('click',function(e) {
        formDataCommon = null;  //リセット
        $('.password-reset-done-field').hide();
        $('.password-reset-field').show();
    })
});