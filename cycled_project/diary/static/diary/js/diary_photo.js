let file_errors = [];

$(document).ready(function() {
    const $diaryFormsetBody = $('#diary-formset-body');
    const diaryMaxNum = $('#id_form-MAX_NUM_FORMS').val();
    const locationMaxNum = $('#id_locations-MAX_NUM_FORMS').val();
    $('#id_form-TOTAL_FORMS').val(0);//初期化
    $('#id_locations-TOTAL_FORMS').val(0);
    $('#id_form-INITIAL_FORMS').val(0);
    $('#id_locations-INITIAL_FORMS').val(0);
    let diaryEntries = [];
    let formEntries = [];
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
            labelIdle: '<span class="icon-upload potta-one-regular">写真を選択してください</span>',
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
        
                        if ('error' in response) {
                            console.error(response.error);
                            file_errors.push(response.error);
                            return;
                        }
                        // let $diaryForm = set_diary(response.diary); //diary初期化
                        // diaryEntries.push({ form: $diaryForm, date: response.diary.date,});
                        // locationNewEntries.push({form: $diaryForm, location: response.location_new}); //locationは新規は後から設置
                        // diary,locationは後から設置
                        formEntries.push({ 
                            diary: response.diary,
                            is_edit: response.diary.diary_id ? true : false,
                            date: response.diary.date,
                            location: response.location_new
                        });
                        
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

                const lastModifiedDate = new Date(file.file.lastModified); // 更新日を取得
                file.setMetadata('lastModifiedDate',lastModifiedDate.toLocaleString({ timeZone: 'Asia/Tokyo' }));
                // file.setMetadata('lastModifiedDate',lastModifiedDate.toISOString());
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
            // すべてのファイルの処理が終わった後に実行される
            onprocessfiles: () => {
                // フォームと同時に登場
                setTimeout(() => {
                    file_errors.forEach((error, _) => {
                        append_error(error);
                    });
                }, 1500);
                if (file_errors.length >= pond.getFiles().length) {
                    append_error('全ての写真でアップロードが失敗しました。');
                    pond.setOptions({
                        allowMultiple: true,  
                    });
                    $('.filepond--drop-label').show();
                    pond.removeFiles();
                    file_errors = [];
                }
                else {
                    var diaries = new Set();
                    formEntries.sort((a, b) => {
                        return a.is_edit === b.is_edit ? 0 : a.is_edit ? -1 : 1;
                    });
                    formEntries.forEach(entry => {
                        let $diaryForm = set_diary(entry.diary);
                        // set_locationInDiary($diaryForm, entry.location);
                        diaryEntries.push({ form: $diaryForm, date: entry.diary.date,})
                        diaries.add($diaryForm);
                        entry.form = $diaryForm;
                    });
                    formEntries.forEach(entry => {
                        set_locationInDiary(entry.form, entry.location);
                    });

                    diaryEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
                    // ソートされた順にフォームを追加
                    diaryEntries.forEach(entry => {
                        $diaryFormsetBody.append(entry.form);
                    });

                    diaries.forEach($form => {
                        check_errors_diary($form);
                    })

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
                sortPrefix();
            },
        });

        function set_diary(diary){
            // 見せるfields
            var fields_show = ['is_public','comment'];

            // 同じ日のDiaryがないか確認
            const $diaryFormSameDict = diaryEntries.find(entry => entry.date === diary.date);
            if ($diaryFormSameDict){
                return $diaryFormSameDict.form
            }
            const diaryNum = $('#id_form-TOTAL_FORMS').val();
            let diaryNewFormHtml = $('#empty-form-diary').html().replace(/__prefix__/g, `${diaryNum}`);
            let $diaryNewForm = $(`<div class='diary-form-wrapper'>`).html(diaryNewFormHtml);
            // 既存のDiaryでない場合にedit-wrapperを追加
            if (!diary.empty) {
                $diaryNewForm.addClass('diary-form-edit');
            }
            // フィールド入力
            let prefix = `form-${diaryNum}-`;
            $diaryNewForm.find('input').each(function() {
                let inputName = $(this).attr('name'); // inputのname属性を取得
                if (inputName && inputName.includes(prefix)) {
                    inputName = inputName.replace(prefix, '');
                    if (diary.hasOwnProperty(inputName)) {
                        $(this).val(diary[inputName]); // 対応するデータをinputにセット
                    }
                    if (!fields_show.includes(inputName)) {
                        $(this).attr('type', 'hidden');
                    }                    
                }
            });

            // テキスト入力
            date = new Date(diary['date']);
            date = date.toLocaleDateString(options = {timeZone: 'UTC'});
            $diaryNewForm.find('.card-diary-date').first().text(date);

            // totalformを変更
            const diaryTotalForms = $('#id_form-TOTAL_FORMS');
            const currentTotal = parseInt(diaryTotalForms.val(), 10) || 0; // NaN の場合は 0 にする
            diaryTotalForms.val(currentTotal + 1); // 更新された値をセット
            // DiaryのNumをlocation用に用意
            $('<input>', {
                type: 'hidden',
                name: 'diary_num', // 隠し入力の名前
                value: diaryNum // 隠し入力の値
            }).appendTo($diaryNewForm); // $diaryNewFormに追加

            //既存のLocations挿入
            if (diary.locations){
                var diaryEditForm = $('#id_form-INITIAL_FORMS');
                var currentDiaryEditTotal = parseInt(diaryEditForm.val(), 10) || 0; // NaN の場合は 0 にする
                diaryEditForm.val(currentDiaryEditTotal + 1); // 更新された値をセット
                diary.locations.forEach(function(location){
                    var locationEditForm = $('#id_locations-INITIAL_FORMS');
                    var currentLocationEditTotal = parseInt(locationEditForm.val(), 10) || 0; // NaN の場合は 0 にする
                    locationEditForm.val(currentLocationEditTotal + 1); // 更新された値をセット
                    set_locationInDiary($diaryNewForm, location);
                });
            }

            $diaryNewForm.find('.button-delete-diary').off('click').on('click', function(e){
                delete_diary($diaryNewForm);
            });

            return $diaryNewForm
        }

        function set_locationInDiary($diaryNewForm, location) {
            const diaryNum = $diaryNewForm.find('input[name="diary_num"]').val();
            const locationsFormsetBody = $diaryNewForm.find(`#id_form-${diaryNum}-location-formset-body`);
            // const locationNum = $('div.locations-form-wrapper').length + $diaryNewForm.find('div.locations-form-wrapper').length;
            const locationNum = $('#id_locations-TOTAL_FORMS').val();
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
            // サムネイルをはめる枠
            const $photoTthumbnail = $diaryNewForm.find(`#id_form-${diaryNum}-thumbnail`);

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
                    $input.attr('type', 'hidden');
                }
            });

            // ランクをクラスに追加
            if (location.rank !== 1){
                $diaryNewForm.find('.card').addClass(`card-rank${location.rank}`);
            }

            // チェックされたLocationがなかった場合
            var $checkedLocation = $diaryNewForm.find(`input[name="location-radiobutton-group-${diaryNum}"]`).filter(':checked');
            var is_thumbnail;
            // locationが既存の場合
            if (location.location_id) {
                is_thumbnail = location.is_thumbnail;
                $locationNewForm.addClass('location-form-edit');
            }
            else {
                is_thumbnail = $checkedLocation.length === 0;
            }
            if (is_thumbnail) {
                // 他全てをfalseに
                var $all_forms = $locationNewForm.find(`input[name^="id_locations-"][name$="-is_thumbnail"]`);
                $all_forms.prop('checked', false);
                $all_forms.val(false);

                var src = window.location.origin + location.image;
                var thumbnail = `<img loading="lazy" src="${src}" class="thumbnail-image thumbnail-image-loaded">`;
                $photoTthumbnail.html(thumbnail);
                $locationNewForm.find(`input[name="location-radiobutton-group-${diaryNum}"]`).prop('checked', true);

                var $is_thumbnail = $locationNewForm.find(`#id_locations-${locationNum}-is_thumbnail`);
                $is_thumbnail.val(true);
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
                var $checkedLocation = $(this).closest('.locations-form-wrapper');

                var $is_thumbnail_all = $diaryNewForm.find('[id*="is_thumbnail"]');
                $is_thumbnail_all.val(false);
                var $is_thumbnail = $checkedLocation.find('[id*="is_thumbnail"]');
                $is_thumbnail.val(true);

                var $angle = $checkedLocation.find('[id*="rotate_angle"]');
                var angle = parseInt($angle.val(), 10) % 360;
                $angle.val(angle);
                var src = window.location.origin + location.image;
                // 新しい Image オブジェクトを作成
                var img = new Image();
                img.src = src;  // 画像のソースを設定
                img.className = 'thumbnail-image';  // 初期状態は非表示
                // 画像が完全に読み込まれたら、アニメーションを実行
                img.onload = function() {
                    $photoTthumbnail.html(img);  // 読み込まれた画像をDOMに挿入
                    $(img).css({'transform': `rotate(${angle}deg)`});
                    setTimeout(function() {
                        $(img).addClass('thumbnail-image-loaded');  // クラスを追加してアニメーションをトリガー
                    }, 100);  // 少し遅延を与えることでアニメーションが確実に適用される
                };
                // アニメーション追加
                $locationNewForm.addClass('scale-up-center');      // 通常アニメーションを追加
                
                // アニメーション終了時にクラスをリセット
                $locationNewForm.on('animationend', function () {
                    $locationNewForm.removeClass('scale-up-center');
                    $locationNewForm.removeClass('scale-down-center');
                    $locationNewForm.off('animationend'); // イベントリスナーを解除
                });          
            });

            $locationNewForm.find('button').off('click').on('click', function() {
                var $radioButton = $locationNewForm.find('.class_location-radiobutton');
                // ラジオボタンがチェックされていない場合のみチェックする
                if (!$radioButton.prop('checked')) {
                    $radioButton.prop('checked', true).trigger('change');     // change イベントを発生させる
                }
            });

            // 写真を回転させるボタン
            $diaryNewForm.find('.class_img-rotate-button').off('click').on('click', function() {
                var $checkedLocation = $diaryNewForm.find('[id*="is_thumbnail"]').filter(function() {
                    return $(this).val() === 'true'; // 値が 'true' のものをフィルタ
                }).closest('.locations-form-wrapper');
                var $angle = $checkedLocation.find('[id*="rotate_angle"]');
                var angle = parseInt($angle.val(), 10);
                angle += 90; // ボタンがクリックされるたびに90度回転
                $diaryNewForm.find('.thumbnail-image').css({'transform': `rotate(${angle}deg)`,'transition':'transform 0.5s ease',}); // CSSのtransformを更新
                $angle.val(angle);
            });

            // 削除ボタン
            $locationNewForm.find('.button-delete-location').off('click').on('click', function(e){
                var diary_id = $diaryNewForm.find('input[id^="id_form-"][id$="-diary_id"]').val();
                var bodyMessage = diary_id ? '既存の日記が削除されます': 'この日記は削除されます';
                var key = diary_id ? 'delete_diary_exist' : 'delete_diary';
                delete_location($locationNewForm,bodyMessage,key,$diaryNewForm);
            });

            // modal関係の関数
            setup_addressModal($locationNewForm,location);

            locationsFormsetBody.append($locationNewForm);
            // totalformを変更
            const locationTotalForms = $('#id_locations-TOTAL_FORMS');
            const currentTotal = parseInt(locationTotalForms.val(), 10) || 0; // NaN の場合は 0 にする
            locationTotalForms.val(currentTotal + 1);
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
    $('input.filepond').show(); //読み込みが終わったら見せる

    $('#id_diary-new-form').submit(function(event) {  
        var error = false;
        event.preventDefault();
        this.classList.toggle('clicked');

        // 新規作成数
        const diaryNum = $('div.diary-form-wrapper').length;
        if (diaryNum !== $('#id_form-TOTAL_FORMS').val()){
            error = true;
        }
        const locationNum = $('div.locations-form-wrapper').length;
        if (locationNum !== $('#id_locations-TOTAL_FORMS').val()){
            error = true;
        }
        // 編集数
        const diaryEditNum = $('.diary-form-edit').length;
        if (diaryEditNum !== $('#id_form-INITIAL_FORMS').val()){
            error = true;
        }
        const locationEditNum = $('.location-form-edit').length;
        if (locationEditNum !== $('#id_locations-INITIAL_FORMS').val()){
            error = true;
        }

        const submitButton = $(event.originalEvent.submitter); // クリックされたボタンを取得
        const buttonName = submitButton.attr('name');
        $('<input>').attr({
            type: 'hidden',
            name: buttonName,
            value: '',
        }).appendTo(this);

        sortPrefix();   //送信前にprefixを整理
        this.submit();
    });

    $('.publish-all-diary').off('click').on('click', function(e) {
        var $field_ispublic = $('.field-is_public');
        $field_ispublic.each(function(_, element) {
            let checkbox = $(element).find("input[type='checkbox']");
            checkbox.prop('checked', true);
        });
    });
    $('.unpublish-all-diary').off('click').on('click', function(e) {
        var $field_ispublic = $('.field-is_public');
        $field_ispublic.each(function(_, element) {
            let checkbox = $(element).find("input[type='checkbox']");
            checkbox.prop('checked', false);
        });
    });
});

function edit_location(button){
    var $labelDisplay = $(button).closest('.locations-form-wrapper').find('.location-list-label-display');
    var $labelInput = $(button).closest('.locations-form-wrapper').find('.class_locations-label');
    var $radioInput = $(button).closest('.locations-form-wrapper').find('.class_location-radiobutton')

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
        input.attr('type', 'hidden');
        input.removeClass('editing'); // editingを削除
        input.hide();
    }
    function showInput(input){
        input.attr('type', 'text');
        input.show();
        input.val(''); // 中身を削除
        input.focus(); // 入力フィールドにフォーカスを当てる
        input.addClass('editing'); // 編集中のinputにクラスを追加
        $radioInput.prop('checked', true); // チェックを入れる
        var count = $(button).closest('.diary-form-wrapper').find('.locations-form-wrapper').length;
        if (count > 1){
            $radioInput.trigger('change');  // changeイベントを手動で発火させる
        }
    }
    // input外をクリックしたらリセット
    $(document).on('click', function(event) {
        // inputやその親要素がクリックされた場合は無視
        if (!$(event.target).closest('.locations-form-wrapper').find('.editing').length) {
            $labelDisplay.show();
            hideInput($labelInput);
        }
    });
}

// enterキャンセルするのはdiaryに関するform入力中のみ
$(document).on('keydown', '.diary-form-wrapper input[type="text"][name="keyword"]', function(e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        e.preventDefault();  // Enterキーのデフォルト動作（submit）を無効化
    }
});

class Error {
    constructor(message, class_name) {
        this.message = message;
        this.class_name = class_name;
        this.is_exist = false;
    }

    append($diaryErrors, $submit) {
        if (!this.is_exist) {
            var error_class = '.' + this.class_name;
            this.is_exist = true;
            if ($diaryErrors.find(error_class).length === 0) {
                var msg_html = $(`<div class="card-errors-element ${this.class_name}">${this.message}</div>`);
                $diaryErrors.append(msg_html);
                $submit.prop('disabled', true);
                $diaryErrors.show();
            }
        }
    }

    remove($diaryErrors, $submit) {
        if(this.is_exist) {
            var error_class = '.' + this.class_name;
            this.is_exist = false;
            $diaryErrors.find(error_class).remove();
            if ($diaryErrors.find('.card-errors-element').length === 0) {  // 修正
                $diaryErrors.hide();
            }
            if ($('.card-errors-element').length === 0) $submit.prop('disabled', false);
        }
    }
}
function check_errors_diary($diaryForm,errors=null) {
    const $submit = $('button[name="diary-new-form"]');
    const $diaryErrors = $diaryForm.find("[id^='id_form-'][id$='-diary-errors']");
    const $locationFormsExist = $diaryForm.find('input[id^="id_locations"][id$="-DELETE"]')
        .filter(function() {
            return !$(this).val(); // 値が空またはfalsyな場合にtrue
        }).parents('.locations-form-wrapper');

    if (!errors) {
        errors = {
            locationNum: new Error(
                `日記に追加できる行先は${MAX_LOCATIONS}個まです。指定数になるまで削除してください`,
                'diary_locationNum_error'
            ),
            noAddress: new Error(
                "ボタンから写真の場所を入力してください",
                'diary_noAddress_error'
            )
        };
    }

    // diary内に許可した以上の loc(visible) があった場合のエラー
    var locationNumInDiary = $locationFormsExist.length;
    if (locationNumInDiary > MAX_LOCATIONS) {
        errors.locationNum.append($diaryErrors, $submit);
    } else {
        errors.locationNum.remove($diaryErrors, $submit);
    }

    // diary 内に空の loc があった場合のエラー
    var hasEmptyLat = false;  // 空のlatがあるかどうかを追跡する変数
    $locationFormsExist.each(function(){
        var lat = $(this).find("[id^='id_locations-'][id$='-lat']").val();
        if (lat) {
            $(this).find('.button-edit-location-label').prop('disabled', false);
            $(this).find('.button-open-addressSearchModal').hide();
        } else {
            $(this).find('.button-open-addressSearchModal').show();
            $(this).find('.button-edit-location-label').prop('disabled', true);
            hasEmptyLat = true;  // 空のlatが見つかったのでフラグを立てる
        }
    });
    if (hasEmptyLat) errors.noAddress.append($diaryErrors, $submit);
    else errors.noAddress.remove($diaryErrors, $submit);

    // lat, lon が入力されたら再帰
    $diaryForm.find('input').on('change', function () {
        var inputValue = $(this).val();
        var inputName = $(this).attr('name');
        if ((inputName.includes('lat') || inputName.includes('lon')) && inputValue) {
            check_errors_diary($diaryForm,errors);
        }
    });

    // locationForm が非表示（削除された）時の処理
    $diaryForm.find('input[id^="id_locations"][id$="-DELETE"]').on('change', function () {
        check_errors_diary($diaryForm,errors);
    });
}

function sortPrefix() {
    const updateFormAttributes = ($forms, name) => {
        const sortedForms = $forms.sort(function(a, b) {
            const aContainsId = $(a).find(`[name^="${name}-"][name$="_id"]`).val();
            const bContainsId = $(b).find(`[name^="${name}-"][name$="_id"]`).val();

            // location_idやdiary_idを含むフォームを先に持ってくる
            if (aContainsId && !bContainsId) return -1;
            if (!aContainsId && bContainsId) return 1;
            return 0;  // 並べ替え基準がない場合はそのまま
        });
        sortedForms.each(function(index) {
            // 各form内のnameとidを変更（nameまたはidにnameが含まれているもの）
            $(this).find(`[name*="${name}-"], [id*="${name}-"]`).each(function() {
                const $input = $(this);
                const currentName = $input.attr('name');
                const currentId = $input.attr('id');
                
                // 'name-数字-' 部分を 'name-{index}-' に変更
                if (currentName) {
                    const newName = currentName.replace(new RegExp(`${name}-\\d+`), `${name}-${index}`);
                    $input.attr('name', newName);
                }
                if (currentId) {
                    const newId = currentId.replace(new RegExp(`${name}-\\d+`), `${name}-${index}`);
                    $input.attr('id', newId);
                }
            });
        });
    };
    
    // diaryFormとlocationFormのprefixをリセット
    updateFormAttributes($('.diary-form-wrapper'), 'form');
    updateFormAttributes($('.locations-form-wrapper'), 'locations');
}

async function delete_diary($diary,to_confirm=true) {
    var diary_id = $diary.find('input[id^="id_form-"][id$="-diary_id"]').val();
    let bodyMessage = diary_id ? '既存の日記が削除されます': 'この日記は削除されます';
    let key = diary_id ? 'delete_diary_exist' : 'delete_diary';

    if (to_confirm) {
        const confirmed = await dont_show_again_popup(key, {
            title: '日記を削除します',
            body: bodyMessage,
            icon: 'warning',
            showCancelButton: true,
            cancelButtonText: 'Cancel',
        });
        if (!confirmed) {
            return false;  // キャンセルされたので処理中断
        }
    }

    // 中に含まれるlocationを削除
    $diary.find('.locations-form-wrapper').each(function(index,el) {
        delete_location($(this),bodyMessage,key,null);
    });

    const $diaryAll = $('.diary-form-wrapper');
    const $diaryExist = $diaryAll.find('input[id^="id_form"][id$="-DELETE"]')
                        .filter(function() {
                            return !$(this).val(); // 値が空またはfalsyな場合にtrue
                        }).parents('.diary-form-wrapper');
    // 1個以下の場合はリロード
    if ($diaryExist.length <= 1) location.href = location.href;
    else {
        var $deleteInput = $diary.find('input[id^="id_form"][id$="-DELETE"]');
        $deleteInput.val(true);
        $deleteInput.trigger('change');
        $diary.slideUp(500); // 500ms（0.5秒）でフェードアウト
    }
}

async function delete_location($locationForm,bodyMessage,key,$diaryForm = null) {
    if ($diaryForm) {
        var $locationExist = $diaryForm.find('input[id^="id_locations"][id$="-DELETE"]')
        .filter(function() {
            return !$(this).val(); // 値が空またはfalsyな場合にtrue
        }).parents('.locations-form-wrapper');
        
        // $diaryFormが指定されてる & Diary内のLocationが２以下の場合
        if ($locationExist.length <= 1) {
            const confirmed = await dont_show_again_popup(key + '_from_loc', {
                title: '日記が削除されます',
                body: bodyMessage,
                icon: 'warning',
                showCancelButton: true,
                cancelButtonText: 'Cancel',
            });
            if (confirmed) delete_diary($diaryForm,to_comfirm=false);
            else return false;
        }    
    
        var $radioButton = $locationForm.find('.class_location-radiobutton').first();
        var $otherradioButtons = $locationExist.find('.class_location-radiobutton').not($radioButton);
        if ($radioButton.is(':checked')){
            var is_thumbnail = $locationForm.find('input[name^="locations-"][name$="-is_thumbnail"]');
            $radioButton.prop('checked',false);
            is_thumbnail.val(false);
    
            var nextRadio = $otherradioButtons.first();
            var nextLocation = nextRadio.closest('.locations-form-wrapper');
            var nextThumbnail = nextLocation.find('input[name^="locations-"][name$="-is_thumbnail"]');
            nextRadio.prop('checked', true);
            nextRadio.trigger('change');
            nextThumbnail.val(true);
        }
    }
    var $deleteInput = $locationForm.find('input[id^="id_locations"][id$="-DELETE"]');
    $deleteInput.val(true);
    $deleteInput.trigger('change');
    $locationForm.slideUp(500); // 非表示にする
    return true;
}