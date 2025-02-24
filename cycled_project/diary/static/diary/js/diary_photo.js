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
                    formEntries.sort((a, b) => {
                        return a.is_edit === b.is_edit ? 0 : a.is_edit ? -1 : 1;
                    });
                    formEntries.forEach(entry => {
                        let $diaryForm = set_diary(entry.diary);
                        // set_locationInDiary($diaryForm, entry.location);
                        diaryEntries.push({ form: $diaryForm, date: entry.diary.date,})
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

            // diary内に許可した以上のlocがあった場合のエラー
            var locationNumInDiary = $diaryNewForm.find('.locations-form-wrapper').length;
            if (locationNumInDiary >= MAX_LOCATIONS) {
                $('button[name="diary-new-form"]').prop('disabled', true);
                const $diaryErrors = $diaryNewForm.find(`#id_form-${diaryNum}-diary-errors`);
                var error_class = '.diary_locationNum_error';

                // 同じメッセージがすでに存在するか確認
                if ($diaryErrors.find(error_class).length === 0) {
                    var msg = $(
                        `<div class="card-errors-element ${error_class}">
                            日記に追加できる行先は${MAX_LOCATIONS}個まです。指定数になるまで削除してください。
                        </div>`
                    );
                    $diaryErrors.append(msg);
                    $diaryErrors.show();
                }
            }

            // diary内にlat,lonが空のlocがあった場合
            if (isNaN(location.lat) || isNaN(location.lon)) {
                $('button[name="diary-new-form"]').prop('disabled', true);
                const $diaryErrors = $diaryNewForm.find(`#id_form-${diaryNum}-diary-errors`);
                var error_class = '.diary_noAddress_error';

                // 同じメッセージがすでに存在するか確認
                if ($diaryErrors.find(error_class).length === 0) {
                    var msg = $(
                        `<div class="card-errors-element ${error_class}">
                            ボタンから写真の場所を入力してください。
                        </div>`
                    );
                    $diaryErrors.append(msg);
                    $diaryErrors.show();
                }
            }    

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

        this.submit();
    });

    $('.publish-all-diary').off('click').on('click', function(e) {
        $field_ispublic = $('.field-is_public');
        $field_ispublic.each(function(index, element) {
            let checkbox = $(element).find("input[type='checkbox']");
            checkbox.prop('checked', true);
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

function delete_location(button) {
    const $diaryForm = $(button.closest('.diary-form-wrapper'));
    const $locationExist = $diaryForm.find('input[name^="locations-"][name$="-DELETE"]')
        .filter(function() {
            return !$(this).val(); // 値が空またはfalsyな場合にtrue
        }).parents('.locations-form-wrapper');
    // Diary内のLocationが２以上の場合実行可能
    if ($locationExist.length > 1){
        const $locationForm = $(button.closest('.locations-form-wrapper'));
        var $deleteInput = $locationForm.find('input[name^="locations-"][name$="-DELETE"]');
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
        $deleteInput.val(true);
        $locationForm.hide(); // 非表示にする
        // totalformを変更
        // const locationTotalForms = $('#id_locations-TOTAL_FORMS');
        // const currentTotal = parseInt(locationTotalForms.val(), 10) || 1; // NaN の場合は 1 にする
        // locationTotalForms.val(currentTotal - 1); // 更新された値をセット

        var locationNumInDiary = $diaryForm.find('.locations-form-wrapper:visible').length;
        if (locationNumInDiary <= MAX_LOCATIONS) {
            $('button[name="diary-new-form"]').prop('disabled', false);
            $diaryForm.find(`.diary_locationNum_error`).remove();
        }
    }
}

$(document).on('keydown', 'input[type="text"]', function(e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        e.preventDefault();  // Enterキーのデフォルト動作（submit）を無効化
    }
});