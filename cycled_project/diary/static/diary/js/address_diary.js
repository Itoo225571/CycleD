import { set_location } from './set_location.js';
export const MyDiary = {
    pk: '',
    setPk: function(newPk) {
        this.pk = newPk;
    },
    getPk: function() {
        return this.pk;
    },
    resetPk: function() {
        return this.pk = '';
    },
};

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
    const initialActionUrl = $('#diaryForm').prop('action');
    // 検索した時の動き
    $('#address-search-form').submit(function(event) {  
        // フォームのデフォルトの動作をキャンセル
        event.preventDefault();
        //前の検索結果を消す
        $('#address-list').children().remove();
        $('#address-list-pager').children().remove();
        //Loadingアイコン表示
        start_loading(true);
        // ここからAjaxリクエストの処理
        var form = $(this);
        var csrftoken = getCookie('csrftoken');
        
        $.ajax({
            method: form.prop("method"),
            url: form.prop("action"),
            data: form.serialize() + "&" + form.attr("name"), //nameをくっつける
            dataType: 'json',
            timeout:60000,
            headers: {
                "X-CSRFToken": csrftoken  // CSRFトークンも必要な場合
            },
        })
    
        .done(function(data) {
            var numofData = 6;
            //Loadingアイコン削除
            remove_loading();
        
            var formDataArray = []; // フォームデータを格納する配列
            $.each(data.data_list, function(index, value) {
                var formData = value
                formDataArray.push(formData); // 配列にフォームデータを追加する
            });
            
            $('#address-list-pager').pagination({
                dataSource: formDataArray,
                pageSize: numofData,
                pageRange: 0,
                ellipsisText: '...',
                prevText: 'Prev',
                nextText: 'Next',
                callback: function(data2, pagination) {
                    $('#address-list').html(template(data2));
                    // ページネーションで生成された新しいボタンにイベントリスナーを再設定
                    $(".address-select-button").off('click').on('click', function(e) {
                        var pageNum = $('.paginationjs-page.active').data('num');
                        var num = parseInt($(this).attr('name')) + numofData * (pageNum - 1);
                        var data = formDataArray[num];
                        set_location(data);
                    });
                }
            });
        })

        .fail(function(jqXHR, textStatus, errorThrown) {
            //Loadingアイコン削除
            remove_loading();
            // エラーメッセージを表示
            $('#address-list').append('<div class="alert alert-danger" role="alert">リクエストがタイムアウトしました。</div>');
        });

    });
    
    $("#get-current-address-form").submit(function(event) {  
        event.preventDefault();
        var form = $(this);
        start_loading(true);
        var watchId;

        function successCallback(address) {
            navigator.geolocation.clearWatch(watchId);
            remove_loading();
            var data = {
                lat : address.coords.latitude,
                lon : address.coords.longitude,
                [form.attr("name")] : "", //nameをくっつける
            }
            var csrftoken = getCookie('csrftoken');
            $.ajax({
                url: form.prop("action"),
                method: form.prop("method"),
                headers: {
                    "X-CSRFToken": csrftoken  // CSRFトークンも必要な場合
                },
                dataType: 'json',
                data: data,
                timeout:60000,  
                success: function (response) {
                    // console.log("Response:", response.data);
                    set_location(response.data)
                },
                error: function (xhr, status, error) {
                    console.error("Error:", status, error);
                }
            });
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
        event.preventDefault();
        const submitButton = $(event.originalEvent.submitter); // クリックされたボタンを取得
        const buttonName = submitButton.attr('name');
        const baseUrl = submitButton.data('url');;
        const diaryPk = MyDiary.getPk();  // MyDiaryオブジェクトから`pk`を取得
        if(diaryPk && baseUrl){
            const newActionUrl = baseUrl.replace(mockUuid, diaryPk);
            $(this).prop('action', newActionUrl);
        }
        $('<input>').attr({
            type: 'hidden',
            name: buttonName,
            value: '',
        }).appendTo(this);
        
        if (buttonName === 'diary-delete-form') {
            const confirmMessage = 'この日記を削除します';
            const userConfirmed = confirm(confirmMessage);
            if (!userConfirmed) {
                return; // ユーザーがキャンセルした場合、フォームの送信をキャンセルする
            }
        }

        else {
            // フォーム数を更新
            const formsetBodynow = $('#formset-body');
            const totalForms = $('#id_locations-TOTAL_FORMS');
            const currentFormCount = formsetBodynow.children().length;
            totalForms.val(currentFormCount);

            // フィールドのバリデーション
            let hasError = false;
            
            if (!$('#id_date').length) {
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
                return; // フォームの送信をキャンセルする
            }
            // 新しいエラーメッセージを追加する関数
            function addErrorMessage(message) {
                hasError = true;
                // 新しいli要素を作成し、アイコンとメッセージを設定
                const newErrorItem = $('<li></li>')
                    .addClass('list-group-item list-group-item-danger') // Bootstrapのクラスを追加
                    .html('<i class="bi bi-exclamation-circle me-2"></i>'
                    + message);
                // ul要素にli要素を追加
                $('#error-normal').append(newErrorItem);
            }

            // Editの時の処理
            if (buttonName === 'diary-edit-form') {
                const confirmMessage = '日記を上書きします';
                const userConfirmed = confirm(confirmMessage);
                if (!userConfirmed) {
                    return; // ユーザーがキャンセルした場合、フォームの送信をキャンセルする
                }
            }
        }
        this.submit();
        // フォームの action をリセット
        $('#diaryForm').prop('action', initialActionUrl);
    });
});