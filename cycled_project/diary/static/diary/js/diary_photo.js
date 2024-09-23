$(document).ready(function() {
    const diaryFormsetBody = $('#diary-formset-body');
    const diaryMaxNum = $('#id_form-MAX_NUM_FORMS').val();
    const locationMaxNum = $('id_locations-MAX_NUM_FORMS').val();
    let diaryEditNum = 0;
    remove_error();

    $('#id_images').on('change', function(event) {
        remove_error();
        $('#id_photos-form').hide();
        
        start_loading(false);
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
                console.log(response);
                remove_loading();
                if (Object.keys(response.location_new).length === 0){
                    append_error(`GPS情報を持つ写真や登録されていない写真が選択されませんでした。`);
                    remove_loading();
                    $('#id_photos-form').show();
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
                $('button[name="diary-new-form"]').show();
            },
            error: function(xhr, status, error) {
                console.error('アップロードに失敗しました。', error);
                append_error(`ファイルのアップロードに失敗しました。`);
                remove_loading();
                $('#id_photos-form').show();
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
                if (inputName === "date") {
                    $(this).attr('type', 'hidden');
                    $(this).prop('readonly', true);
                }
            });

            // テキスト入力
            date = new Date(diary['date']);
            date = date.toLocaleDateString(options = {timeZone: 'UTC'});
            var cardHeader = $diaryNewForm.find('.card-header').first();
            cardHeader.text(date);
            
            return $diaryNewForm
        }

        function set_locationInDiary($diaryNewForm, location, dTransfer_all=null) {
            const diaryNum = $('div.diary-form-wrapper').length;
            const locationsFormsetBody = $diaryNewForm.find(`#id_form-${diaryNum}-location-formset-body`);
            const locationNum = $('div.locations-form-wrapper').length + $diaryNewForm.find('div.locations-form-wrapper').length;
            let locationNewFormHtml = $('#empty-form-location').html().replace(/__prefix__/g, `${locationNum}`);
            let $locationNewForm = $(
                `<div class="locations-form-wrapper">
                    <input class="location-radiobutton visually-hidden" type="radio" name="location-radiobutton-group-${diaryNum}" id="id_location-radiobutton-${diaryNum}-${locationNum}">
                    <label for="id_location-radiobutton-${diaryNum}-${locationNum}" class="location-label" style="display: block;">
                        <li class="location-list d-flex justify-content-between border-radius-lg">
                            ${locationNewFormHtml}
                        </li>
                    </label>
                </div>`
            );
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
                //最初のtextセット
                if (name === "label") {
                    var $display = $locationNewForm.find('.location-list-label-display');
                    $display.text(value);
                }
                if (name !== "temp_image" && name !==`location-radiobutton-group-${diaryNum}`) {
                    $input.prop('readonly', true);
                    $input.attr('type', 'hidden');
                }
                // file用の調整
                if (name === "temp_image") {
                    $input.attr('disabled', true); 
                    $input.hide(); 
                }
            });

            // 画像をセット
            if (dTransfer_all && typeof location.file_order !== 'undefined' && dTransfer_all.files[location.file_order]) { 
                let dataTransfer = new DataTransfer(); // 新しい DataTransfer オブジェクトを作成
                dataTransfer.items.add(dTransfer_all.files[location.file_order]);
                const fileInput = $locationNewForm.find(`#id_locations-${locationNum}-temp_image`)[0];
                if (fileInput) {  // fileInput が存在するか確認
                    fileInput.files = dataTransfer.files;
                }
            } else {
                console.error('ファイルが正しく設定されていません。');
            }

            // 画像レビュー
            var $photoReview = $locationNewForm.find(`#id_locations-${locationNum}-imagePreview`);
            var src = 'data:image/jpeg;base64,' + location.photo_review;
            var tooltipContent = `<img src="${src}" class="tooltip-image">`;
            $photoReview.attr('data-bs-toggle', 'tooltip');
            $photoReview.attr('data-bs-html', 'true');
            $photoReview.attr('data-bs-placement', 'auto');
            $photoReview.attr('title', tooltipContent);  // ツールチップの内容を設定
            var tooltip = new bootstrap.Tooltip($photoReview[0]);  // jQueryからDOM要素を取得
            $photoReview.show();  // プレビューを表示

            // サムネイル
            var $photoTthumbnail = $diaryNewForm.find(`#id_form-${diaryNum}-thumbnail`);
            var thumbnail = `<img src="${src}" class="thumbnail-image">`;
            $photoTthumbnail.html(thumbnail);

            // diaryが既存の場合，そのIDをセット
            // location.diary = $diaryNewForm.find(`#id_form-${diaryNum}-id`).val();
            var date = $diaryNewForm.find(`#id_form-${diaryNum}-date`).val();
            $locationNewForm.find(`#id_locations-${locationNum}-date_of_Diary`).val(date);
            locationsFormsetBody.append($locationNewForm);

            // 値変更の監視
            $locationNewForm.find('.class_locations-label').on('change', function() {
                var $display = $(this).closest('.locations-form-wrapper').find('.location-list-label-display');
                var label = $(this).val();
                $display.text(label);
            });            
            // Enterキーが押されたときのイベントリスナー
            $locationNewForm.find('.class_locations-label').on('keydown', function(e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();  // Enterキーのデフォルト動作を無効化
                    edit_location($(this));     // 関数を実行
                    $(this).trigger('change');  // changeイベントを手動でトリガー
                }
            });

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
        // event.preventDefault();
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

        // 画像を変更可能にする
        $('[id*="temp_image"]').prop('disabled', false);

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

function edit_location(button){
    var $labelDisplay = $(button).closest('.locations-form-wrapper').find('.location-list-label-display');
    var $labelInput = $(button).closest('.locations-form-wrapper').find('.class_locations-label');
    var $otherLabelDisplays = $('.location-list-label-display').not($labelDisplay);
    var $otherLabelInputs = $('.class_locations-label').not($labelInput);

    if ($labelDisplay.is(":visible")) {
        $labelDisplay.hide();
        $otherLabelDisplays.show();

        showInput($labelInput);
        hideInput($otherLabelInputs);
    }
    else {
        $labelDisplay.show();
        hideInput($labelInput);
    }
    function hideInput(input){
        input.prop('readonly', true);
        input.attr('type', 'hidden');
        input.hide();
    }
    function showInput(input){
        input.prop('readonly', false);
        input.attr('type', 'text');
        input.show();
    }
}

$(document).on('keydown', 'input[type="text"]', function(e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        e.preventDefault();  // Enterキーのデフォルト動作（submit）を無効化
    }
});