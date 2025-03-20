function setup_addressModal($locationForm) {
    const $modal = $('#AddressSearchModal');
    const $diary_modal = $('#diaryModal');
    const user_id = $modal.find('#user-info').data('user-id');
    pre_modalOpen();
    $diary_modal.modal('hide');
    $modal.modal('show');

    function pre_modalOpen() {
        // imageセット
        const imageSrc = $locationForm.find('.location-img-url').val();
        const $imgField = $modal.find('.modal-diary-img-field');
        const html = `<img src="${imageSrc}" class="modal-diary-img rounded" alt="場所の写真">`;
        $imgField.html(html);
        // 履歴表示
        displayHistory($('#id_keyword'),modalClose,user_id);
        // 検索要素を初期化
        $modal.find('#id_keyword').val('');
        $modal.find('#id_location-list').empty();
        $modal.find('#pagination').empty();
    }

    function modalClose(location) {
        $locationForm.find('input[name^="locations-"]').each(function(index, input) {
            const name = input.name.replace(/^locations-\d+-/, "");
            if (name === 'is_thumbnail' || name === 'rotate_angle') return;    //変更してほしくないのでスルー
            const value = searchKeys(location,name);
            if (value) {
                $(input).val(value);  // 値を設定
                $(input).trigger('change');  // change イベントを発生させる
            }            
        });
        $modal.modal('hide');
        $diary_modal.modal('show');
        return
    }

    function select_location(location_list, $button) {
        var index = $button.data('index');
        var location = location_list[index];
        storeHistory(location,user_id);
        modalClose(location);
    }

    $modal.find('.get-current-address-button').off('click').on('click', function(e) {
        const url = $(this).data('url');
        get_current_address(url)
            .then(location => {
                // ここでレスポンスを処理
                modalClose(location);
            })
            .catch(error => {
                console.error('エラー:', error);
            });
    });

    $modal.find('.address-search-form').off("submit").on("submit", function(event) {
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
};