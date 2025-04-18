$(document).ready(function () {
    let isConfirmed = false;  // フラグを追加

    $('form').on('submit', function (e) {
        if (isConfirmed) {
            return; // すでに確認済みならそのまま送信
        }
        e.preventDefault();  // デフォルトの送信を止める
        const $form = $(this);  // `this` を退避しておく

        Swal.fire({
            title: 'ほんまに退会しますか？',
            text: 'この操作は取り消せません',
            icon: 'warning',
            iconColor: '#e74c3c', // 真っ赤に近い危険色
            showCancelButton: true,
            confirmButtonText: '退会します',
            cancelButtonText: 'キャンセル',
            confirmButtonColor: '#c0392b', // 赤系で強調
            cancelButtonColor: '#95a5a6', // 無難な色
            reverseButtons: true,
            focusCancel: true,
            customClass: {
                popup: 'swal2-danger-popup',
                confirmButton: 'swal2-danger-button'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                isConfirmed = true; // フラグを立てて
                $form.submit();     // 再送信（次は確認なし）
            }
        });
    });
});
