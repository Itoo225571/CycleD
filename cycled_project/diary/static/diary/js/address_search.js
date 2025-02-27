function get_current_address(url_getCurrentPos,href=null) {
    return new Promise((resolve, reject) => {
        const options = {
            enableHighAccuracy: true,       // 高精度の位置情報を取得
            timeout: 10*1000,                  // 10秒以内に取得できなければエラー
            maximumAge: 5 * 60,             // キャッシュ
        };
        // 共通処理（成功・失敗に関わらず呼ばれる）
        function finallyCallback() {
            remove_loading();
        }
        start_loading();
        
        // 失敗時の処理
        function errorCallback(error) {
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    console.error("ユーザーが位置情報の取得を拒否しました");
                    alert("ユーザーが位置情報の取得を拒否しました");
                break;
                case error.POSITION_UNAVAILABLE:
                    console.error("位置情報が取得できませんでした");
                    alert("位置情報が取得できませんでした");
                break;
                case error.TIMEOUT:
                    console.error("位置情報の取得がタイムアウトしました");
                    alert("位置情報の取得がタイムアウトしました");
                break;
                default:
                    console.error("不明なエラーが発生しました", error);
                    alert("不明なエラーが発生しました", error);
            }
            finallyCallback();
        }

        function successCallback(position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
        
            $.ajax({
                url: url_getCurrentPos,
                type: 'POST',
                headers: {
                    "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンの取得
                },
                data: {
                    'lat': latitude,
                    'lon': longitude,
                    'image': href,
                },
                dataType: "json",
                success: function(response) {
                    resolve(response);  // Promiseをresolveしてレスポンスを返す
                },
                error: function(xhr, status, error) {
                    console.error("AJAXエラー:", status, error);  // コンソールに詳細を出力
                    alert('エラーが発生しました。再度お試しください。');
                    reject('AJAXエラー');
                },
                complete: function() {
                    finallyCallback(); // 最後に必ず呼ぶ
                }
            });
        }
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
    });
}

function search_address(url_searchAddress,keyword) {
    return new Promise((resolve, reject) => {
        start_loading();
        $.ajax({
            url: url_searchAddress,
            type: 'POST',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンの取得
            },
            data: {
                'keyword': keyword,
            },
            dataType: "json",
            success: function(response) {
                resolve(response.data_list);  // Promiseをresolveしてデータを返す
            },
            error: function(xhr, status, error) {
                console.error("AJAXエラー:", status, error);  // コンソールに詳細を出力
                alert('エラーが発生しました。再度お試しください。');
                reject(error);  // Promiseをreject
            },
            complete: function() {
                remove_loading();  // 成功・失敗に関わらず必ず実行
            }
        });
    });
}

// addressが選ばれた場合，func_selectedを実行
function display_location_list(location_list,func_selected) {
    function template(dataArray) {
        return dataArray.map(function(data, index) {
            return `
                <button type="button" 
                        class="address-select-button list-group-item list-group-item-action border border-3 border-light rounded-3 m-1 p-2 d-flex align-items-center"
                        data-index="${index}">
                    <i class="material-icons-outlined me-2 rounded-circle bg-light p-1">location_on</i>
                    <span>${data.address.label}</span>
                </button>
            `;
        }).join('');  // 配列を文字列に結合
    }
    // ページネーション設定
    const options = {
        dataSource: location_list,  // データソース（表示するアイテムのリスト）
        pageSize: 10,                // 1ページあたりに表示するアイテム数
        pageRange: 1,               // 表示するページリンクの数
        showPrevious: true,         // 前のページリンクを表示するかどうか
        showNext: true,             // 次のページリンクを表示するかどうか
        showPageNumbers: true,      // ページ番号を表示するかどうか

        prevText: '<',           // 前のページリンクのテキスト
        nextText: '>',           // 次のページリンクのテキスト
        useBootstrap: true,         // Bootstrapのスタイルを適用するかどうか
        ulClass: 'pagination pagination-sm', // `<ul>` 要素に適用するクラス
        activeClass: 'active',      // 現在のページリンクに適用するクラス
        disabledClass: 'disabled',  // 無効化されたページリンクに適用するクラス

        callback: function(data, pagination) {
            const html = template(data);   // 新しいページデータに基づいてテンプレートを生成
            $('#id_location-list').html(html); // ページ内容を更新
        },
    };
    // ページネーションを作成
    $('#pagination').pagination(options);
    $('#id_location-list').find('.address-select-button').off('click').on('click', function() {
        func_selected(location_list, $(this));  // クリックされたボタンと location_list を渡す
    });
    
    return;
}