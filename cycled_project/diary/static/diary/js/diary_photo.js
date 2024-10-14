$(document).ready(function() {
    const diaryFormsetBody = $('#diary-formset-body');
    const diaryMaxNum = $('#id_form-MAX_NUM_FORMS').val();
    const locationMaxNum = $('#id_locations-MAX_NUM_FORMS').val();
    let diaryEditNum = 0;
    let locationEditNum = 0;
    let errorCount = 0;
    remove_error();

    // FilePondを初期化
    $('input.filepond').each(function() {
        // プラグインをインポート
        FilePond.registerPlugin(FilePondPluginFileValidateSize);
        // FilePond.registerPlugin(FilePondPluginFileValidateType);
        const maxFileSize = '10MB';
        FilePond.setOptions({
            allowFileSizeValidation : true,//制御をON
            maxFileSize : maxFileSize,//上限値は10MB
            labelMaxFileSizeExceeded : '写真のサイズが大きすぎます！',
            labelMaxFileSize : `ファイルサイズは${maxFileSize}までです`,
        });
        // FilePondインスタンスを作成
        const pond = FilePond.create(this, {
            storeAsFile: false,
            allowMultiple: true,
            maxFiles: Math.min(diaryMaxNum,locationMaxNum),
            maxParallelUploads: 8, // 同時にアップロードするファイルの最大数
            allowRemove: false,
            allowRevert: false,
            labelIdle: '<span class="icon-upload">写真を選択してください</span>',
            labelFileLoading: '写真を読み込んでいます...',
            labelFileAdded: '写真が追加されました',
            labelFileProcessing: '写真をアップロードしています...',
            labelFileProcessingComplete: 'アップロード完了',
            labelFileProcessingError: 'アップロードエラー', 
            
            labelTapToCancel: '',
            labelTapToUndo: '',

            instantUpload: true,
            server: {
                process: {
                    url: url_photos2Locations,  // ファイルのアップロード先URL
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')  // DjangoのCSRFトークンをセット
                    },
                    onload: (response) => {
                        // アップロード成功時の処理
                        response = JSON.parse(response);
                        console.log(response);
        
                        if ('error' in response) {
                            console.error(response.error);
                            errorCount += 1;
                            append_error(response.error);
                            return;
                        }
                        // 編集するDiaryの数をセット
                        let Diary = response.diary
                        if (!Diary.empty) {
                            diaryEditNum += 1;
                        }
                        let $diaryForm = set_diary(Diary);
                        set_locationInDiary($diaryForm, response.location_new);
                        diaryFormsetBody.append($diaryForm);
                        
                        return ;
                    },
                    onerror: (response,file) => {
                        // エラー処理
                        console.error('アップロードに失敗しました。', response);
                        pond.setOptions({
                            allowMultiple: true,  
                        });
                        $('.filepond--drop-label').show();
                        return ;
                    }
                },
            },
            onerror: (error,file) => {
                // ここでエラーメッセージを表示する
                console.error(error);
            },
            onwarning: (warning) => {
                let msg = '不明な警告が発生しました';
                const maxFiles = pond.maxFiles;
                // 警告の種類によってメッセージを変更
                switch (warning.body) {
                    case 'Max files':
                        msg = `最大 ${maxFiles} 個のファイルを選択できます`;
                        break;
                    case 'File size too large':
                        return;
                    default:
                        msg = warning.body || '不明な警告が発生しました';
                }
                console.warn('警告:', warning);
                alert(`警告: ${msg}`);
            },
            // 追加された後にファイル選択を無効にする
            onaddfile: (error, file) => {
                remove_error();
                if (error) {
                    console.error('ファイル追加エラー:', error);
                    setTimeout(() => {
                        pond.removeFile(file); 
                    }, 2000);
                    return;
                }
                // ファイル選択を無効にする
                pond.setOptions({
                    allowMultiple: false,  
                });
                $('.filepond--drop-label').hide();
            },
            // 1ファイルアップロードが完了したときに実行される
            onprocessfile: (error,file) => {
                setTimeout(() => {
                    var element = $(`#filepond--item-${file.id}`);
                    element.fadeOut(() => {
                        element.addClass('hidden');
                    });
                }, 1500);
            },
            // すべてのファイルがアップロードされた後の処理
            onprocessfiles: () => {
                if (errorCount >= pond.getFiles().length) {
                    append_error('全ての写真でアップロードが失敗しました。');
                    pond.setOptions({
                        allowMultiple: true,  
                    });
                    $('.filepond--drop-label').show();
                    pond.removeFiles();
                    errorCount = 0;
                }
                else {
                    setTimeout(() => {
                        // フェードアウトアニメーションを追加
                        $('#id_photos-form').fadeOut(400);
                    }, 1000); 
                    // タイミングをずらしてフェードインさせる
                    setTimeout(() => {
                        $('.diary-photo-container').fadeIn(400); // 400msのフェードイン
                        $('button[name="diary-new-form"]').fadeIn(400); // 400msのフェードイン
                    }, 1500);
                }
            },
        });

        function set_diary(diary){
            let $diaryExistingForm = null;
            // 同じ日のDiaryがないか確認
            diaryFormsetBody.find('input[id^="id_form-"][id$="-date"]').each(function() {
                var date = $(this).val();
                if (date === diary.date){
                    $diaryExistingForm = $(this).closest('.diary-form-wrapper');
                    return false; // ループを終了
                }
            });
            if ($diaryExistingForm){
                return $diaryExistingForm
            }
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

            // 新しいinput hiddenを追加
            $('<input>', {
                type: 'hidden',
                name: 'diary_num', // 隠し入力の名前
                value: diaryNum // 隠し入力の値
            }).appendTo($diaryNewForm); // $diaryNewFormに追加

            //既存のLocations挿入
            if (diary.locations){
                diary.locations.forEach(function(location){
                    set_locationInDiary($diaryNewForm, location);
                    locationEditNum += 1;
                });
            }
            return $diaryNewForm
        }

        function set_locationInDiary($diaryNewForm, location) {
            const diaryNum = $diaryNewForm.find('input[name="diary_num"]').val();
            const locationsFormsetBody = $diaryNewForm.find(`#id_form-${diaryNum}-location-formset-body`);
            const locationNum = $('div.locations-form-wrapper').length + $diaryNewForm.find('div.locations-form-wrapper').length;
            // const locationNum = $('div.locations-form-wrapper').length;
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

            // チェックされたLocationがなかった場合
            var $checkedLocation = $diaryNewForm.find(`input[name="location-radiobutton-group-${diaryNum}"]`).filter(':checked');
            var is_thumbnail;
            if (location.location_id) {
                is_thumbnail = location.is_thumbnail;
            }
            else {
                is_thumbnail = $checkedLocation.length === 0;
            }
            if (is_thumbnail) {
                // 他全てをfalseに
                var $all_forms = $locationNewForm.find(`input[name^="id_locations-"][name$="-is_thumbnail"]`);
                $all_forms.prop('checked', false);
                $all_forms.prop('readonly', false);
                $all_forms.val(false);
                $all_forms.prop('readonly', true);

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
            $locationNewForm.find(`#id_locations-${locationNum}-diary`).val('');
            var date = $diaryNewForm.find(`#id_form-${diaryNum}-date`).val();
            $locationNewForm.find(`#id_locations-${locationNum}-date_of_Diary`).val(date);

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

            if (locationNum > MAX_LOCATIONS) {
                $('button[name="diary-new-form"]').prop('disabled', true);
            }

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
        const locationInitialForms = $('#id_locations-INITIAL_FORMS');
        locationInitialForms.val(locationEditNum);

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