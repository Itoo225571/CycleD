$(document).ready(function() {
    $('.togglePassword').on('click', function () {
        // ボタンから一番近くのtype="password"のinputを選択
        const passwordField = $(this).closest('div').find('input[type="password"], input.show-password');
        const passwordIcon = $(this).closest('div').find('.password-icon');

        if (passwordField.length ===0 ) {
            console.error('パスワードinputが見つけられません');
            return;
        }
        
        if (passwordField.attr('type') === 'password') {
            passwordField.attr('type', 'text');  // パスワードを表示
            passwordIcon.removeClass('bi-eye-slash').addClass('bi-eye');
        } else {
            passwordField.attr('type', 'password');  // パスワードを非表示
            passwordIcon.removeClass('bi-eye').addClass('bi-eye-slash');
        } 
        passwordField.toggleClass('show-password');
    });
});