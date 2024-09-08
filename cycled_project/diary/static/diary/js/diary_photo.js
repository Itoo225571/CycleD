$(document).ready(function() {
    const diaryFormsetBody = $('#diary-formset-body');
    const diaryMaxNum = $('#id_form-MAX_NUM_FORMS').val();
    remove_error();

    // const formMaxNum = $('#id_form-MAX_NUM_FORMS').val();
    $('#id_images').on('change', function(event) {
        remove_error();
        const form = $(this).closest('form');
        const files = event.target.files;
        if (!files) {
            append_error(`写真が選択されていません。`)
            return
        }

        let formData = new FormData();
        const dt = new DataTransfer();
        $.each(files, function(index, file) {
            formData.append('location_files', file);  // サーバー側で受け取るフィールド名
            dt.items.add(file);
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
                if (Object.keys(response.photo_data).length === 0){
                    append_error(`GPS情報を持つ写真が選択されませんでした。`)
                    return
                }
                $.each(response.photo_data, function(date, oneday_location_list) {
                    $diaryNewForm = set_diary(date);
                    $.each(oneday_location_list, function(_, location) {
                        set_locationInDiary($diaryNewForm, location, dt);
                    });
                    diaryFormsetBody.append($diaryNewForm);
                });
            },
            error: function(xhr, status, error) {
                console.error('アップロードに失敗しました。', error);
                append_error(`ファイルのアップロードに失敗しました。`);
            },
        });

        function set_diary(date){
            const diaryNum = diaryFormsetBody.children().length;
            let diaryNewFormHtml = $('#empty-form-diary').html().replace(/form-__prefix__/g, `form-${diaryNum}`);
            diaryNewFormHtml = diaryNewFormHtml.replace(/locations-/g, `locations-${diaryNum}-`);
            let $diaryNewForm = $(`<div id='diary-form-wrapper-${diaryNum}'>`).html(diaryNewFormHtml);
            // dateフィールド入力
            $diaryNewForm.find(`input[id="id_form-${diaryNum}-date"]`).val(date);
            return $diaryNewForm
        }

        function set_locationInDiary($diaryNewForm,location, dt_all) {
            const diaryNum = diaryFormsetBody.children().length;
            const locationsFormsetBody = $diaryNewForm.find(`#id_form-${diaryNum}-location-formset-body`);
            const locationNum = locationsFormsetBody.children().length;

            let locationNewFormHtml = $('#empty-form-location').html().replace(/locations-__prefix__/g, `locations-${diaryNum}-${locationNum}`);
            let $locationNewForm = $(`<div id="locations-form-wrapper-${diaryNum}-${locationNum}">`).html(locationNewFormHtml);
            let prefix = `locations-${diaryNum}-${locationNum}-`;

            $locationNewForm.find('input').each(function() {
                let $input = $(this);
                let name = $input.attr('name');
                name = name.replace(prefix, '');
                if (name==="id"){
                    name = "location_id"
                }
                const value = searchKeys(location,name);
                // 値を取得して設定する
                if (value) {
                    $input.val(value);
                }
                // $input.attr('type', 'hidden');
            });

            let dataTransfer = new DataTransfer(); // 新しい DataTransfer オブジェクトを作成
            dataTransfer.items.add(dt_all.files[location.file_order]);
            const fileInput = $locationNewForm.find('input[type="file"]')[0];
            fileInput.files = dataTransfer.files

            locationsFormsetBody.append($locationNewForm);
            return

            function searchKeys(obj, keyToFind) {
                let result = undefined;
                function search(o) {
                    for (const key in o) {
                        if (o.hasOwnProperty(key)) {
                            if (key === keyToFind) {
                                result = o[key];
                                return; // 結果が見つかった場合、検索を終了
                            }
                            if (typeof o[key] === 'object' && o[key] !== null) {
                                search(o[key]);
                                if (result !== undefined) return; // 結果が見つかった場合、早期リターン
                            }
                        }
                    }
                }
                search(obj);
                return result;
            }
        }

    });

    $('#add-diary').on('click', function(event){
        const diaryFormsetBody = $('#diary-formset-body');
        const diaryNum = diaryFormsetBody.children().length;
        const diaryMaxNum = $('#id_form-MAX_NUM_FORMS').val();
        const locationNum = $(`#id_form-${diaryNum}-locations-formset-body`).children().length;

        let diaryNewFormHtml = $('#empty-form-diary').html().replace(/form-__prefix__/g, `form-${diaryNum}`);
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
