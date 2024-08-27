function template(dataArray){
    return dataArray.map(function(data,index){
        var locationIcon =
            `<span class="fa-stack fa-lg">
                <i class="fa-solid fa-circle fa-stack-2x" style="color: #cdcdcd;"></i>
                <i class="fa-solid fa-location-dot fa-stack-1x" ></i>
            </span>`;
        var html = 
            `<form method="post" class="address-select" name="address-select-form">
                <button type="button" class="address-select-button list-group-item list-group-item-action boder border-3 border-light rounded-3 m-1 p-2" name="${index}">
                    ${locationIcon}
                    ${data.address.label}
                </button>
            </form>`;
        return html;
    })
}

// 距離を計算する関数
function distance(lat1, lng1, lat2, lng2) {
    const R = Math.PI / 180;
    lat1 *= R;
    lng1 *= R;
    lat2 *= R;
    lng2 *= R;
    return 6371 * Math.acos(Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1) + Math.sin(lat1) * Math.sin(lat2));
}


document.addEventListener('DOMContentLoaded', function() {
    const totalForms = $('#id_locations-TOTAL_FORMS');
    const maxnumForms = $('#id_locations-MAX_NUM_FORMS');

    // 検索した時の動き
    $('#address-search-form').submit(function(event) {  
        // フォームのデフォルトの動作をキャンセル
        event.preventDefault();
        //前の検索結果を消す
        $('#address-list').children().remove();
        $('#address-list-pager').children().remove();
        //Loadingアイコン表示
        start_loading(false);
        // ここからAjaxリクエストの処理
        var csrftoken = getCookie('csrftoken');
        var form = $(this);
        
        $.ajax({
            method: form.prop("method"),
            url: form.prop("action"),
            headers: {
                "X-CSRFToken": csrftoken  // CSRFトークンも必要な場合
            },
            data: form.serialize() + "&" + form.attr("name"), //nameをくっつける
            dataType: 'json',
            timeout:60000,
        })
    
        .done(function(data) {
            //Loadingアイコン削除
            remove_loading();
        
            var formDataArray = []; // フォームデータを格納する配列
            $.each(data.data_list, function(index, value) {
                var formData = value
                formDataArray.push(formData); // 配列にフォームデータを追加する
            });
            
            $('#address-list-pager').pagination({
                dataSource: formDataArray,
                pageSize: 6,
                pageRange: 0,
                ellipsisText: '...',
                prevText: 'Prev',
                nextText: 'Next',
                callback: function(data2,pagination){
                    $('#address-list').html(template(data2));
                }
            });

            $(".address-select-button").on('click', function(){
                // var form = $(this).parents('form');
                var num = $(this).attr('name');
                var data = formDataArray[num];
                // submit_loc(data,form)
                set_location(data);
            });
        })

        .fail(function(jqXHR, textStatus, errorThrown) {
            //Loadingアイコン削除
            remove_loading();
            // エラーメッセージを表示
            $('#address-list').append('<div class="alert alert-danger" role="alert">リクエストがタイムアウトしました。</div>');
        });

    });
    
    $(".get-current-address-button").on('click', function(){
        var form = $(this).parents('form');
        start_loading(false);
        var watchId;

        function successCallback(address) {
            navigator.geolocation.clearWatch(watchId);
            remove_loading();
            var data ={
                lat : address.coords.latitude,
                lon : address.coords.longitude,
            }
            // submit_loc(data,form);
        }

        function errorCallback(error) {
            navigator.geolocation.clearWatch(watchId);
            remove_loading();
            console.error('位置情報の送信に失敗しました:', error.message);
        }
        watchId = navigator.geolocation.watchPosition(
            successCallback,
            errorCallback,
            {
                maximumAge : 5000 ,
                timeout : 10000 ,
                enableHighAccuracy : true
            }
        );
    });

    // Diaryを作成した時の動き
    $('#diaryForm').submit(function(event) {  
        // フォーム数を更新
        const formsetBodynow = $('#formset-body');
        const currentFormCount = formsetBodynow.children().length;
        totalForms.val(currentFormCount);

        // フィールドのバリデーション
        let hasError = false;
        let error_normal_field = document.getElementById('error-normal');
        error_normal_field.innerHTML = '';
        if (!$('#id_date_field').length) {
            addErrorMessage('サイクリング日時は必須です。');
        }
        if (!currentFormCount) {
            addErrorMessage('地域は必須です。');
        }
        // formsetの値が空だった場合
        $('#formset-body input').each(function() {
            if (!$(this).val()){
                let label = $('label[for="' + $(this).attr('id') + '"]').text(); // ラベルのテキストを取得
                // required以外はラベルが空になる
                if (label){
                    addErrorMessage(`${label}が入力されていません`);
                }
            }
        });    
        // エラーがある場合はフォーム送信をキャンセル
        if (hasError) {
            event.preventDefault(); // フォームの送信をキャンセルする
        }
        // 新しいエラーメッセージを追加する関数
        function addErrorMessage(message) {
            hasError = true
            // 新しいli要素を作成し、メッセージを設定
            const newErrorItem = document.createElement('li');
            newErrorItem.textContent = message;
            // ul要素にli要素を追加
            error_normal_field.appendChild(newErrorItem);
        }
        // event.preventDefault();
    });

    // ______関数______
    function set_location(data){
        // 現在のフォームの総数を取得
        const formsetBody = $('#formset-body');
        const formCount = formsetBody.children().length;
    
        const formMax = parseInt(maxnumForms.val());
        if (formCount < formMax){
            // empty-form の HTML を取得し、__prefix__ を現在のフォーム数で置換
            let newFormHtml = $('#empty-form').html().replace(/__prefix__/g, formCount);
            let $newFormHtml = $('<tr>').append($('<td>').html(newFormHtml));
            let prefix = `locations-${formCount}-`;
            
            // フォームの内容を変更
            $newFormHtml.find('input').each(function() {
                let $input = $(this);
                let name = $input.attr('name');
                name = name.replace(prefix, '');
                const value = searchObject(data,name);
                // data オブジェクトから値を取得して設定する
                if (value) {
                    $input.val(value);
                    if (name == "label") {
                        var label_HTML = 
                        `<span class="fa-stack fa-lg">
                            <i class="fa-solid fa-circle fa-stack-2x" style="color: #cdcdcd;"></i>
                            <i class="fa-solid fa-location-dot fa-stack-1x" ></i>
                        </span>
                        ${value}
                        <button type="button" class="bi bi-trash delete-location" style="color: red;"></button>
                        `;
                        $newFormHtml.find('.label-display').html(label_HTML);
                    }
                }
                $input.attr('type', 'hidden');
            });
            // 削除ボタンにクリックイベントを設定
            $newFormHtml.find('.delete-location').on('click', function() {
                $(this).closest('tr').remove(); // 親の<tr>要素を削除
            });
            formsetBody.append($newFormHtml);
        }
        else{
            alert(`サイクリング場所は${formMax}個まで追加できます`)
            return
        }    
        function searchObject(obj, keyToFind) {
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