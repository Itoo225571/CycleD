$(document).ready(function() {
    const $container = $('.address-form-container');
    const user_id = $container.find('#user-info').data('user-id');
    displayHistory($('#id_keyword'),submitLocation,user_id);   // 履歴表示

    $container.find('.get-current-address-button').off('click').on('click', function(e) {
        const url = $(this).data('url');
        get_current_address(url)
            .then(location => {
                submitLocation(location);   // location登録
            })
            .catch(error => {
                console.error('エラー:', error);
            });
    });

    $container.find('.address-search-form').off("submit").on("submit", function(event) {
        event.preventDefault();
        var url = $(this).attr("action");
        var $input = $(this).find("input[name='keyword']");
        
        search_address(url, $input)
            .then(location_list => {
                // ここでレスポンスを処理
                display_location_list(location_list,select_location);
            })
            .catch(error => {
                console.error('エラー:', error);
                // 大元でエラー処理してるので基本不要
                // alert('エラーが発生しました。再度お試しください。');
            });
    });

    // 履歴削除ボタン
    $container.find('.button-delete-history').off('click').on('click',function(e) {
        var $input = $(this).closest('.address-search-form').find("input[name='keyword']");
        deleteHistory($input,user_id);
    });

    function select_location(location_list, $button) {
        var index = $button.data('index');
        var location = location_list[index];
        storeHistory(location,user_id);
        submitLocation(location);
    }

    function submitLocation(location) {
        const $form = $('#id_locationform');
        $form.find('input').each(function(_, input) {
            var name = $(input).attr('name');
            var val = searchKeys(location,name);
            if (val) $(this).val(val);
        });
        $form.submit();
        start_loading();
    }
    
});

