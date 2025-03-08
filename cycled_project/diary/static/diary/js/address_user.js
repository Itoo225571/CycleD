$(document).ready(function() {
    const $container = $('.address-form-container');
    displayHistory($('#id_keyword'),submitLocation);   // 履歴表示

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
            });
    });

    function select_location(location_list, $button) {
        var index = $button.data('index');
        var location = location_list[index];
        storeHistory(location);
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

