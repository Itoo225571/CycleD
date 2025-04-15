$(document).ready(function() {
    $('.button-logout').off('click').on('click',function(e) {
        e.preventDefault();
        var url = $(this).data('url')
        logout(url);
    });
});

function logout(url_logout) {
    Swal.fire({
        title: 'ログアウトしますか？',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'はい',
        cancelButtonText: 'キャンセル',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: url_logout,
                type: 'POST',
                headers: {
                    "X-CSRFToken": getCookie('csrftoken')
                },
                success: function(response) {
                    window.location.href = '/';
                },
                error: function(xhr, errmsg, err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'ログアウトに失敗しました',
                        text: '再度お試しください',
                        confirmButtonText: 'OK'
                    });
                }
            });
        }
    });
}
