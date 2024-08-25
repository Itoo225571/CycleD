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

function submit_loc(data,form){
    var csrftoken = getCookie('csrftoken');
    $('<input>').attr({
        'type': 'hidden',
        'name': 'csrfmiddlewaretoken', // CSRFトークンの名前は 'csrfmiddlewaretoken' である必要があります
        'value': csrftoken
    }).appendTo(form);

    $('<input>').attr({
        'type': 'hidden',
        'name': form.prop("name"),
        'value': ""
    }).appendTo(form);
    
    appendObject(data,form);

    //console.log(form);
    form.submit();
}

function appendObject(data, form) {
    $.each(data, function(key, value) {
        if (typeof value === 'object' && value !== null) {
            // オブジェクトの場合、そのプロパティを再帰的に処理
            appendObject(value, form);
        } else {
            // プリミティブ型の場合、そのままフォームに追加
            $('<input>').attr({
                'type': 'hidden',
                'name': key,
                'value': value
            }).appendTo(form);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
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
                var form = $(this).parents('form');
                var num = $(this).attr('name');
                var data = formDataArray[num];
                submit_loc(data,form)
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
            submit_loc(data,form);
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

    const totalForms = $('#id_locations-TOTAL_FORMS');
    const maxnumForms = $('#id_locations-MAX_NUM_FORMS');

    $('#add-form-btn').click(function(e) {
        // 現在のフォームの総数を取得
        const formsetBody = $('#formset-body');
        const formCount = formsetBody.children().length;

        const formMax = parseInt(maxnumForms.val());
        if (formCount < formMax){
            // empty-form の HTML を取得し、__prefix__ を現在のフォーム数で置換
            let newFormHtml = $('#empty-form').html().replace(/__prefix__/g, formCount);
            // 新しいフォームをフォームセットのリストに追加
            formsetBody.append('<tr><td>' + newFormHtml + '</td></tr>');

            // フォームの内容を変更
            const latField = document.querySelector(`#id_locations-${formCount}-lat`);
            latField.value = 11;
            latField.setAttribute('readonly', 'true'); // 読み取り専用に設定
        }
        else{
            alert(`サイクリング場所は${formMax}個まで追加できます`)
            return
        }
    });

    // 検索した時の動き
    $('#diaryForm').submit(function(event) {  
        // フォーム数を更新
        const formsetBodynow = $('#formset-body');
        const currentFormCount = formsetBodynow.children().length;
        totalForms.val(currentFormCount);

        // フィールドのバリデーション
        let hasError = false;
        let error_normal_field = document.getElementById('error-normal');
        if (!$('#id_date_field').length) {
            addErrorMessage('サイクリング日時は必須です。');
        }
        if (!currentFormCount) {
            addErrorMessage('地域は必須です。');
        }
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
    });
});