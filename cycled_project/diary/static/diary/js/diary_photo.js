$(document).ready(function() {
    const diaryFormsetBody = $('#diary-formset-body');
    const diaryMaxNum = $('#id_form-MAX_NUM_FORMS').val();
    const locationMaxNum = $('id_locations-MAX_NUM_FORMS').val();
    let diaryEditNum = 0;
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
                    append_error(`GPS情報を持つ写真や登録されていない写真が選択されませんでした。`)
                    return
                }
                // 編集するDiaryの数をセット
                // diaryEditNum += Object.keys(response.diary_existed).length;
                $.each(response.location_new, function(date, oneday_location_list){
                    let Diary = response.diary_existed[date] || {date: date, empty: true };
                    if (!Diary.empty) {
                        diaryEditNum += 1;
                    }
                    let $diaryForm = set_diary(Diary);
                    // $.each(response.location_existed[date],function(_,location){
                    //     $diaryForm = set_locationInDiary($diaryForm, location);
                    // });
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
            const diaryNum = $('div.diary-form-wrapper').length;
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
                // $(this).attr('type', 'text');
            });
            
            return $diaryNewForm
        }

        function set_locationInDiary($diaryNewForm, location, dTransfer_all=null) {
            const diaryNum = $('div.diary-form-wrapper').length;
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
                const value = searchKeys(location,name);
                // 値を取得して設定する
                if (value) {
                    $input.val(value);
                }
                if (name !== "label") {
                    // $input.prop('disabled', true);
                    $input.prop('readonly', true);
                    $input.attr('type', 'hidden');
                }
                // $input.attr('type', 'hidden');
                // $(this).attr('type', 'text');
            });

            if (dTransfer_all && typeof location.file_order !== 'undefined') {   
                let dataTransfer = new DataTransfer(); // 新しい DataTransfer オブジェクトを作成
                dataTransfer.items.add(dTransfer_all.files[location.file_order]);
                const fileInput = $locationNewForm.find(`#id_locations-${locationNum}-temp_image`)[0];
                fileInput.files = dataTransfer.files

                // let reader = new FileReader();
                // reader.onload = function(e) {
                //     $(`#id_locations-${locationNum}-imagePreview`).attr('src', e.target.result);
                //     $(`#id_locations-${locationNum}-imagePreview`).show();  // プレビューを表示
                // }
                // let imgFile = dataTransfer.files[0]
                // if (imgFile.type === 'image/heic') {
                //     heic2any({
                //         blob: imgFile,
                //         toType: 'image/jpeg'
                //     }).then(function (jpegBlob) {
                //         reader.readAsDataURL(jpegBlob);     // 変換された JPEG Blob を FileReader で読み込む
                //     }).catch(function (error) {
                //         console.error('HEIC 画像の変換中にエラーが発生しました:', error);
                //     });
                // } else {
                //     reader.readAsDataURL(imgFile);
                // }
            }

            if (location.photo_review){
                var src = 'data:image/jpeg;base64,' + location.photo_review;
                $locationNewForm.find(`#id_locations-${locationNum}-imagePreview`).attr('src', src);
                $locationNewForm.find(`#id_locations-${locationNum}-imagePreview`).show();  // プレビューを表示
            }

            // diaryが既存の場合，そのIDをセット
            // location.diary = $diaryNewForm.find(`#id_form-${diaryNum}-id`).val();
            var date = $diaryNewForm.find(`#id_form-${diaryNum}-date`).val();
            $locationNewForm.find(`#id_locations-${locationNum}-date_of_Diary`).val(date);

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
        const diaryNum = $('div.diary-form-wrapper').length;
        diaryTotalForms.val(diaryNum);
        const diaryInitialForms = $('#id_form-INITIAL_FORMS');
        diaryInitialForms.val(diaryEditNum);
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
