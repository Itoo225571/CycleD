$(document).ready(function() {
    const diaryFormsetBody = $('#diary-formset-body');
    const diaryMaxNum = $('#id_form-MAX_NUM_FORMS').val();
    const locationMaxNum = $('id_locations-MAX_NUM_FORMS').val();
    remove_error();

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
                console.log(response)
                if (Object.keys(response.location_new).length === 0){
                    append_error(`GPS情報を持つ写真が選択されませんでした。`)
                    return
                }

                $.each(response.location_new, function(date, oneday_location_list){
                    let Diary = response.diary_existed[date] || {date: date};
                    let $diaryForm = set_diary(Diary);
                    if (response.location_existed[date]){
                        oneday_location_list.unshift(response.location_existed[date]);
                    }
                    $.each(oneday_location_list, function(_, location) {
                        $diaryForm = set_locationInDiary($diaryForm, location, dt);
                    });
                    diaryFormsetBody.append($diaryForm);
                });

            },
            error: function(xhr, status, error) {
                console.error('アップロードに失敗しました。', error);
                append_error(`ファイルのアップロードに失敗しました。`);
            },
        });

        function set_diary(diary){
            const diaryNum = diaryFormsetBody.children().length;
            let diaryNewFormHtml = $('#empty-form-diary').html().replace(/__prefix__/g, `${diaryNum}`);
            let $diaryNewForm = $(`<div class='diary-form-wrapper'>`).html(diaryNewFormHtml);
            // フィールド入力
            let prefix = `form-${diaryNum}-`;
            $diaryNewForm.find('input, textarea').each(function() {
                let inputName = $(this).attr('name'); // inputのname属性を取得
                inputName = inputName.replace(prefix, '');
                if (diary.hasOwnProperty(inputName)) {
                  $(this).val(diary[inputName]); // 対応するデータをinputにセット
                }
                // $(this).attr('type', 'hidden');
            });
            return $diaryNewForm
        }

        function set_locationInDiary($diaryNewForm, location, dTransfer_all=null) {
            const diaryNum = diaryFormsetBody.children().length;
            const locationsFormsetBody = $diaryNewForm.find(`#id_form-${diaryNum}-location-formset-body`);
            const locationNum = $('div.locations-form-wrapper').length + $diaryNewForm.find('div.locations-form-wrapper').length;
            let locationNewFormHtml = $('#empty-form-location').html().replace(/__prefix__/g, `${locationNum}`);
            let $locationNewForm = $(`<div class="locations-form-wrapper">`).html(locationNewFormHtml);
            let prefix = `locations-${locationNum}-`;

            $locationNewForm.find('input').each(function() {
                let $input = $(this);
                let name = $input.attr('name');
                name = name.replace(prefix, '');
                if (name==="id"){
                    name = "location_id"
                }
                if (name==="diary"){
                    name = "diary_id"
                }
                const value = searchKeys(location,name);
                // 値を取得して設定する
                if (value) {
                    $input.val(value);
                }
                // $input.attr('type', 'hidden');
            });

            if (dTransfer_all && typeof location.file_order !== 'undefined') {   
                let dataTransfer = new DataTransfer(); // 新しい DataTransfer オブジェクトを作成
                dataTransfer.items.add(dTransfer_all.files[location.file_order]);
                const fileInput = $locationNewForm.find(`#id_locations-${locationNum}-temp_image`)[0];
                fileInput.files = dataTransfer.files
            }

            $locationNewForm.find(`#id_locations-${locationNum}-index_of_Diary`).val(diaryNum);

            locationsFormsetBody.append($locationNewForm);
            
            return $diaryNewForm

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

    $('#id_diary-new-form').submit(function(event) {  
        event.preventDefault();
        // Diaryの合計数を編集
        const diaryTotalForms = $('#id_form-TOTAL_FORMS');
        const diaryNum = diaryFormsetBody.children().length;
        diaryTotalForms.val(diaryNum);
        // Locationの合計数を編集
        const locationTotalForms = $('#id_locations-TOTAL_FORMS');
        const locationNum = $('div.locations-form-wrapper').length;
        locationTotalForms.val(locationNum);
        
        const submitButton = $(event.originalEvent.submitter); // クリックされたボタンを取得
        const buttonName = submitButton.attr('name');
        $('<input>').attr({
            type: 'hidden',
            name: buttonName,
            value: '',
        }).appendTo(this);
        this.submit();
    });
});
