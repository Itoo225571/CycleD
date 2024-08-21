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
    const form = document.getElementById('address-search-form');
    // submitした時の動き
    form.addEventListener('submit', function(event) {
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
            data: form.serialize() + "&" + form.attr("name"),
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
                pageSize: 12,
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

});