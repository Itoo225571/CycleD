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
            var errorText = '不明なエラーが発生しました';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorText = "ユーザーが位置情報の取得を拒否しました";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorText = "位置情報が取得できませんでした";
                    break;
                case error.TIMEOUT:
                    errorText = "位置情報の取得がタイムアウトしました";
                    break;
                default:
                    console.error("不明なエラーが発生しました", error);
                    errorText = `不明なエラーが発生しました: ${error.message ?? error}`;
            }
            Swal.fire({
                icon: 'error',
                title: 'エラー',
                text: errorText,
                confirmButtonText: 'OK'
            });
            finallyCallback();
        }

        function successCallback(position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            // console.log(latitude,longitude)
        
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
                    'is_home': true     // is_homeをtrueにする
                },
                dataType: "json",
                success: function(response) {
                    resolve(response);  // Promiseをresolveしてレスポンスを返す
                },
                error: function(xhr, status, error) {
                    try {
                        var responseData = JSON.parse(xhr.responseText);  // レスポンスの内容をJSONとしてパース
                        var errorText = '不明なエラーが発生しました';
                        if (responseData.detail) {
                            console.error('エラー詳細:', responseData.detail);  // detailを出力
                            errorText = responseData.detail;
                        } else {
                            console.error('エラー詳細がありません');
                        }
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorText,
                            confirmButtonText: 'OK'
                        });
            
                        // その他のエラー詳細（例えば errors）があれば処理
                        if (responseData.errors) {
                            for (var field in responseData.errors) {
                                console.error(field + ' エラー:', responseData.errors[field].join(', '));
                            }
                        }
                    } catch (e) {
                        console.error('レスポンスの解析エラー:', e);
                    }
                    reject(error);
                },
                complete: function() {
                    finallyCallback(); // 最後に必ず呼ぶ
                }
            });
        }
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
    });
}

function search_address(url_searchAddress,$input) {
    $input.blur();  // $inputからフォーカスを外す
    return new Promise((resolve, reject) => {
        start_loading();
        $.ajax({
            url: url_searchAddress,
            type: 'POST',
            headers: {
                "X-CSRFToken": getCookie('csrftoken')  // CSRFトークンの取得
            },
            data: {
                'keyword': $input.val(),
            },
            dataType: "json",
            success: function(response) {
                resolve(response.data_list);  // Promiseをresolveしてデータを返す
            },
            error: function(xhr, status, error) {
                try {
                    var responseData = JSON.parse(xhr.responseText);  // レスポンスの内容をJSONとしてパース
                    if (responseData.detail) {
                        console.error('エラー詳細:', responseData.detail);  // detailを出力
                        alert('エラー: ' + responseData.detail);  // ユーザーに詳細を通知
                    } else {
                        console.error('エラー詳細がありません');
                    }
        
                    // その他のエラー詳細（例えば errors）があれば処理
                    if (responseData.errors) {
                        for (var field in responseData.errors) {
                            console.error(field + ' エラー:', responseData.errors[field].join(', '));
                        }
                    }
                } catch (e) {
                    console.error('レスポンスの解析エラー:', e);
                }

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
    function template(dataArray,startIndex) {
        return dataArray.map(function(data, index) {
            return `
                <button type="button" 
                        class="address-select-button list-group-item list-group-item-action border border-3 border-light rounded-3 m-1 p-2 d-flex align-items-center"
                        data-index="${startIndex + index}">  <!-- startIndexを足す -->
                    <i class="material-icons-outlined me-2 rounded-circle bg-light p-1">location_on</i>
                    <span>${data.address.label}</span>
                </button>
            `;
        }).join('');
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
            const startIndex = (pagination.pageNumber - 1) * options.pageSize; // 現在のページの開始インデックスを計算
            const html = template(data,startIndex);   // 新しいページデータに基づいてテンプレートを生成
            $('#id_location-list').html(html); // ページ内容を更新

            $('#id_location-list').find('.address-select-button').off('click').on('click', function() {
                func_selected(location_list, $(this));  // クリックされたボタンと location_list を渡す
            });
        },
    };
    // ページネーションを作成
    $('#pagination').pagination(options);

    return;
}

// 履歴保存（最大10件まで）
function storeHistory(location,user_id) {
    let history = JSON.parse(localStorage.getItem(`locationSelected-${user_id}`)) || [];
    
    // 既に同じデータがある場合は削除
    history = history.filter(item => JSON.stringify(item) !== JSON.stringify(location));
    
    // 配列の末尾に新しい履歴を追加
    history.push(location);

    // 10個を超えたら先頭の要素を削除
    if (history.length > 5) {
        history.shift();
    }

    localStorage.setItem(`locationSelected-${user_id}`, JSON.stringify(history));
}

// 履歴表示
function displayHistory($input,setLocation,user_id) {
    const history = JSON.parse(localStorage.getItem(`locationSelected-${user_id}`)) || [];
    // 履歴のアイテムごとにlabelとlocationをペアで作成 (末尾から作成)
    const labelsWithLocation = history.reverse().map(item => ({
        label: searchKeys(item, 'label'),
        location: item
    }));

    $input.autocomplete({
        source: labelsWithLocation,  // labelとlocationをペアとして渡す
        autoFocus: false,
        collapsible: true,
        delay: 300,
        minLength: 0, // 入力なしでも履歴を表示
        position: {
            my: "left top", // 自身の位置を入力フィールドの下部に設定
            at: "left bottom+2"  // リストを上に10pxずらす（隙間を持たせる）
        },
        select: function(event, ui) {
            // ui.itemにはlabelとlocationが含まれている
            setLocation(ui.item.location);
        },
    }).data("ui-autocomplete")._renderItem = function (ul, item) {
        return $("<li>")
        .data("item.autocomplete", item)
        .append(`
            <div class="autocomplete-item">
                <div class="d-flex align-content-center">
                    <i class="material-icons-outlined me-2 text-body">history</i>
                    <span class="text-body">${item.label}</span>
                </div>
            </div>
        `)
        .appendTo(ul);
    };    
    
    // input が focus された時に強制的に履歴を表示
    $input.on('focus', function() {
        $(this).autocomplete("search", ""); // 空文字を検索してリストを表示
    });
}

// 履歴削除
function deleteHistory($input,user_id) {
    localStorage.removeItem(`locationSelected-${user_id}`);
    // autocompleteの中身をリセット
    $input.autocomplete("option", "source", []);  // sourceを空の配列に変更
    $input.autocomplete("search", "");  // 空文字で検索してリストを非表示
}