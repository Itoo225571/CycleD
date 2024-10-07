$(document).ready(function() {
    const diaryFormsetBody = $('#diary-formset-body');
    const diaryMaxNum = $('#id_form-MAX_NUM_FORMS').val();
    const locationMaxNum = $('#id_locations-MAX_NUM_FORMS').val();
    let diaryEditNum = 0;
    remove_error();

    // FilePondを初期化
    $('input.filepond').each(function() {
        // プラグインをインポート
        FilePond.registerPlugin(FilePondPluginFileValidateSize);
        FilePond.setOptions({
            allowFileSizeValidation : true,//制御をON
            maxFileSize : '2MB',//上限値は2MB(2メガバイト)
            labelMaxFileSizeExceeded : 'ファイルサイズが大きすぎます！',
            labelMaxFileSize : 'ファイルサイズは2MBまでです',
        });
        // FilePondインスタンスを作成
        const pond = FilePond.create(this, {
            storeAsFile: true,
            allowMultiple: true,
            maxFiles: locationMaxNum,
            allowRemove: false,
            labelIdle: 'ここにファイルをドラッグ＆ドロップするか、<span class="filepond--label-action">ファイルを選択</span>してください。',
            labelFileLoading: 'ファイルを読み込んでいます...',
            labelFileAdded: 'ファイルが追加されました',
            labelFileCount: '{count} 個のファイルが選択されています',
            labelFileProcessing: 'ファイルをアップロードしています...',
            labelFileProcessingComplete: 'アップロード完了',
            labelFileProcessingError: 'アップロードエラー',
            onaddfile: (error, file) => {
                // ファイルが追加されたときの処理
                if (error) {
                    console.error('ファイル追加エラー:', error);
                    return;
                }
                // AJAXリクエストの準備
                const formData = new FormData();
                formData.append('location_files', file.file);  // FilePondが提供するファイル
                // 名前を追加
                const form = $(this).closest('form'); // これで正しいフォームを取得
                formData.append(form.prop("name"), '');

                // AJAXリクエスト
                $.ajax({
                    url: url_photos2Locations,  // Djangoでファイルを処理するためのURL
                    type: 'POST',
                    data: formData,
                    processData: false,  // jQueryがデータを処理しないように設定
                    contentType: false,  // ファイルのMIMEタイプを自動で設定
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken') // DjangoのCSRFトークン
                    },
                    beforeSend: function() {
                        // 通信中の表示を変更
                        pond.setOptions({
                            labelFileProcessing: 'アップロード中...'
                        });
                        console.log('UPLOAD')
                    },
                    success: function(response) {
                        console.log(response);
                        remove_loading();
                        if (Object.keys(response.location_new).length === 0) {
                            append_error(`GPS情報を持つ写真や登録されていない写真が選択されていませんでした。`);
                            $('#id_photos-form').show();
                            return;
                        }
                        
                        // 編集するDiaryの数をセット
                        $.each(response.location_new, function(date, oneday_location_list) {
                            let Diary = response.diary_existed[date] || { date: date, empty: true };
                            if (!Diary.empty) {
                                diaryEditNum += 1;
                            }
                            let $diaryForm = set_diary(Diary);
                            $.each(oneday_location_list, function(_, location) {
                                $diaryForm = set_locationInDiary($diaryForm, location);
                            });
                            diaryFormsetBody.append($diaryForm);
                        });
                        $('.diary-photo-container').show();
                        $('button[name="diary-new-form"]').show();
                    },
                    error: function(xhr, status, error) {
                        console.error('アップロードに失敗しました。', error);
                        append_error(`ファイルのアップロードに失敗しました。`);
                        pond.setOptions({
                            labelFileProcessing: 'アップロードエラー',
                        });
                    },
                });
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

        function set_locationInDiary($diaryNewForm, location) {
            const diaryNum = $('div.diary-form-wrapper').length;
            const locationsFormsetBody = $diaryNewForm.find(`#id_form-${diaryNum}-location-formset-body`);
            const locationNum = $('div.locations-form-wrapper').length + $diaryNewForm.find('div.locations-form-wrapper').length;
            let locationNewFormHtml = $('#empty-form-location').html().replace(/__prefix__/g, `${locationNum}`);
            let $locationNewForm = $(
                `<div class="locations-form-wrapper">
                    <input  class="class_location-radiobutton visually-hidden" 
                            type="radio" name="location-radiobutton-group-${diaryNum}"
                            id="id_location-radiobutton-${diaryNum}-${locationNum}">
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
                if (name !==`location-radiobutton-group-${diaryNum}`) {
                    $input.prop('readonly', true);
                    $input.attr('type', 'hidden');
                }
            });

            // サムネイルと選択肢の初期設定
            var LocationNumInDiaryThis = $diaryNewForm.find(`input[name="location-radiobutton-group-${diaryNum}"]`).length; 
            if (LocationNumInDiaryThis === 0) {
                var src = window.location.origin + location.image;
                var $photoTthumbnail = $diaryNewForm.find(`#id_form-${diaryNum}-thumbnail`);
                var thumbnail = `<img loading="lazy" src="${src}" class="thumbnail-image thumbnail-image-loaded">`;
                $photoTthumbnail.html(thumbnail);
                $locationNewForm.find(`input[name="location-radiobutton-group-${diaryNum}"]`).prop('checked', true);

                var $is_thumbnail = $locationNewForm.find(`#id_locations-${locationNum}-is_thumbnail`);
                $is_thumbnail.prop('readonly', false);
                $is_thumbnail.val(true);
                $is_thumbnail.prop('readonly', true);
            }

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

            // 選択されたラジオボタンのlocation.imageを表示
            $locationNewForm.find('.class_location-radiobutton').on('change', function() {
                var isChecked = $(this).is(':checked'); // 変更されたラジオボタンがONかどうかを確認
                var $is_thumbnail = $locationNewForm.find(`#id_locations-${locationNum}-is_thumbnail`);
                $is_thumbnail.prop('readonly', false);
                if (isChecked) {
                    var src = window.location.origin + location.image;
                    var $photoTthumbnail = $diaryNewForm.find(`#id_form-${diaryNum}-thumbnail`);
                    // 新しい Image オブジェクトを作成
                    var img = new Image();
                    img.src = src;  // 画像のソースを設定
                    img.className = 'thumbnail-image';  // 初期状態は非表示
                    // 画像が完全に読み込まれたら、アニメーションを実行
                    img.onload = function() {
                        $photoTthumbnail.html(img);  // 読み込まれた画像をDOMに挿入
                        setTimeout(function() {
                            $(img).addClass('thumbnail-image-loaded');  // クラスを追加してアニメーションをトリガー
                        }, 10);  // 少し遅延を与えることでアニメーションが確実に適用される
                    };

                    $is_thumbnail.val(true);
                }
                else {
                    $is_thumbnail.val(false);
                }
                $is_thumbnail.prop('readonly', true);
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
        this.classList.toggle('clicked');
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