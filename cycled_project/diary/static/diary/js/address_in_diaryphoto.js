let $locationFormWrapper;

$(document).ready(function() {
    const $button_getCurrentAddress = $('.get-current-address-button');
    const $form_addressSearch = $('.address-search-form');

    $button_getCurrentAddress.off('click').on('click', function(e) {
        const url = $(this).data('url');
        get_current_address(url)
            .then(location => {
                // console.log(location);
                // ここでレスポンスを処理
                const $inputs = $locationFormWrapper.find('input');
                applyLocationInput(location,$inputs);
                post_processing();
            })
            .catch(error => {
                console.error('エラー:', error);
            });
    });

    $form_addressSearch.on("submit", function(event) {
        event.preventDefault();
        const url = $(this).attr("action");
        const keyword = $(this).find("input[name='keyword']").val();
        search_address(url, keyword)
            .then(location_list => {
                // ここでレスポンスを処理
                display_location_list(location_list,select_address);
            })
            .catch(error => {
                console.error('エラー:', error);
            });
    });

    // 親要素にイベントデリゲーションを設定
    $(document).on('click', '.button-open-addressSearchModal', function(e) {
        $locationFormWrapper = $(this).closest('.locations-form-wrapper');
        const $img = $locationFormWrapper.find('[name$="image"]').first();
    });

    function select_address(location_list, $button) {
        const index = $button.data('index');
        const location = location_list[index];
        const $inputs = $locationFormWrapper.find('input');
        applyLocationInput(location,$inputs);
        post_processing();
    }
});

function applyLocationInput(location,$inputs) {
    $.each(location, function(key, value) {
        if (typeof value === 'object' && value !== null) {
            // オブジェクトの場合、そのプロパティを再帰的に処理
            applyLocationInput(value, $inputs);
        } else {
            // name属性がkeyと一致するinputを探してvalueを代入
            const $input = $inputs.filter(function() {
                return $(this).attr('name') && $(this).attr('name').endsWith(key);
            });
            if ($input.length > 0) {
                $input.val(value);  // 値を代入
            }
            if (key === 'display') {
                $locationFormWrapper.find('.location-list-label-display').html(value);
            }
        }
    });
}

function post_processing() {
    const $diaryFormWrapper = $locationFormWrapper.closest('.diary-form-wrapper');
    const $button_openModal = $locationFormWrapper.find('.button-open-addressSearchModal');
    $button_openModal.hide();
    // $locationFormWrapper.find('.location-list-label-display').html(location.address.label);
    $('#AddressSearchModal').modal('hide');
}