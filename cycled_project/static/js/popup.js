async function dont_show_again_popup(key, options={}) {
    const dontShowKey = 'dont_show_again' + key;
    const dontShow = localStorage.getItem(dontShowKey);
    // 表示しない
    if (dontShow === 'true') return true;   //非表示の場合はtrueを返す

    // オプションのデフォルト値を設定
    const defaultOptions = {
        title: "ご注意!",                 // デフォルトのタイトル
        body: "",  // デフォルトの本文
        confirmButtonText: 'OK',        // デフォルトの確認ボタンテキスト
    };

    // 引数で渡されたオプションをデフォルトオプションで上書き
    const config = { ...defaultOptions, ...options };
    const bodyHtml = config.body ? `<p>${config.body}</p>` : '';    // bodyが空でない場合のみ<p>タグを追加

    // Swal.fire は非同期なので、await で結果が返るまで待つ
    const result = await Swal.fire({
        html: `
            ${bodyHtml}
            <div class="form-check d-flex justify-content-center">
                <input class="form-check-input me-2" type="checkbox" id="swal-dontShowAgainCheckbox">
                <label class="form-check-label fw-bold fs-6" for="swal-dontShowAgainCheckbox">
                    今後このメッセージを表示しない
                </label>
            </div>
        `,
        // オプションで他のSweetAlert2のオプションも使用可能
        ...config,  // 他のオプションも展開して渡す

        preConfirm: () => {
            const checked = $('#swal-dontShowAgainCheckbox').prop('checked'); // .prop()を使用
            if (checked) {
                localStorage.setItem(dontShowKey, 'true');     // 非表示設定
            }
        }
    });

    // 処理が完了した後、結果を返す（isConfirmed が true の場合はOKボタンが押された）
    return result.isConfirmed;
}