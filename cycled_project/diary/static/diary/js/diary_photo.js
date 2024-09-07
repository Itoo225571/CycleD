$(document).ready(function() {
    // const formMaxNum = $('#id_form-MAX_NUM_FORMS').val();
    $('#id_images').on('change', function(event) {
        const form = $(this).closest('form');
        const files = event.target.files;
        if (!files) {
            append_error(`写真が選択されていません。`)
            return
        }

        let formData = new FormData();
        $.each(files, function(index, file) {
            formData.append('location_files', file);  // サーバー側で受け取るフィールド名
        });
        formData.append(form.prop("name"),'');

        $.ajax({
            url: form.prop("action"),  // Djangoでファイルを処理するためのURL
            type: form.prop("method"),
            data: formData,
            processData: false,  // ファイルを送信するため、jQueryがデータを処理しないように設定
            contentType: false,  // ファイルのMIMEタイプを自動で設定
            headers: {
                'X-CSRFToken': getCookie('csrftoken') // DjangoのCSRFトークン
            },
            success: function(response) {
                console.log(response.locations_data)
                // 成功時の処理をここに追加
            },
            error: function(xhr, status, error) {
                console.error('アップロードに失敗しました。', error);
                append_error(`ファイルのアップロードに失敗しました。`);
            }
        });
    });

    $('#add-diary').on('click', function(event){
        const diaryFormsetBody = $('#diary-formset-body');
        const diaryNum = diaryFormsetBody.children().length;
        const diaryMaxNum = $('#id_form-MAX_NUM_FORMS').val();
        const locationNum = $(`#id_form-${diaryNum}-locations-formset-body`).children().length;

        let diaryNewFormHtml = $('#empty-form').html().replace(/form-__prefix__/g, `form-${diaryNum}`);
        diaryNewFormHtml = diaryNewFormHtml.replace(/locations-__prefix__/g, `locations-${diaryNum}-${locationNum}`);
        let $diaryNewForm = $(`<div id='diary-form-wrapper-${diaryNum}'>`).html(diaryNewFormHtml);

        let locationsManagementForm = $diaryNewForm.find('.locations-management').html();
        locationsManagementForm = locationsManagementForm.replace(/locations-/g, `locations-${diaryNum}-`);
        // 置換後のHTMLを再度要素にセット
        $diaryNewForm.find('.locations-management').html(locationsManagementForm);

        let locationsFormsetBody = $diaryNewForm.find(`#id_form-${diaryNum}-locations-formset-body`).html();
        let wrappedLocationsFormsetBody = `<div id="locations-form-wrapper-${diaryNum}-${locationNum}">${locationsFormsetBody}</div>`;
        $diaryNewForm.find(`#id_form-${diaryNum}-locations-formset-body`).html(wrappedLocationsFormsetBody);

        diaryFormsetBody.append($diaryNewForm);
    });
});

function handleImageFile(file) {
    // 例: ファイルの情報をコンソールに表示
    console.log(`選択されたファイル名: ${file.name}`);
    console.log(`ファイルサイズ: ${file.size} bytes`);
    
    // 例: 画像を表示する
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imgElement = document.createElement('img');
        imgElement.src = e.target.result;
        document.body.appendChild(imgElement); // 画像をページに追加
    };
    
    reader.readAsDataURL(file);
}