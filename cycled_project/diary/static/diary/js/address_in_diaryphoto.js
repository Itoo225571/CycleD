$(document).ready(function() {
    // 親要素にイベントデリゲーションを設定
    $(document).on('click', '.button-open-addressSearchModal, .button-edit-addressSearchModal', function(e) {
        var $locationFormWrapper = $(this).closest('.locations-form-wrapper');
        var $img = $locationFormWrapper.find('[name$="image"]').first();
        var $modal = $('#AddressSearchModal');

        $modal.find('.get-current-address-button').off('click').on('click', function(e) {
            const url = $(this).data('url');
            get_current_address(url)
                .then(location => {
                    // console.log(location);
                    // ここでレスポンスを処理
                    var $inputs = $locationFormWrapper.find('input');
                    var $display = $locationFormWrapper.find('.location-list-label-display');
                    applyLocationInput(location,$inputs);
                    applyLocationDisplay(location,$display);
                    post_processing();
                })
                .catch(error => {
                    console.error('エラー:', error);
                });
        });
    
        $modal.find('.address-search-form').on("submit", function(event) {
            event.preventDefault();
            var url = $(this).attr("action");
            var keyword = $(this).find("input[name='keyword']").val();
            search_address(url, keyword)
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
            var $inputs = $locationFormWrapper.find('input');
            var $display = $locationFormWrapper.find('.location-list-label-display');
            applyLocationInput(location,$inputs);
            applyLocationDisplay(location,$display);
            post_processing();
        }

        function applyLocationInput(location,$inputs) {
            $.each(location, function(key, value) {
                if (typeof value === 'object' && value !== null) {
                    // オブジェクトの場合、そのプロパティを再帰的に処理
                    applyLocationInput(value, $inputs);
                } else {
                    // name属性がkeyと一致するinputを探してvalueを代入
                    var $input = $inputs.filter(function() {
                        return $(this).attr('name') && $(this).attr('name').endsWith(key);
                    });
                    if ($input.length > 0) {
                        $input.val(value);  // 値を代入
                    }
                }
            });
        }
        function applyLocationDisplay(location,$display) {
            var label = searchKeys(location, 'label') || searchKeys(location, 'display');
            $display.html(label);
        }
        
        function post_processing() {
            var $diaryFormWrapper = $locationFormWrapper.closest('.diary-form-wrapper');
            var $button_openModal = $locationFormWrapper.find('.button-open-addressSearchModal');
            $button_openModal.hide();
            // $locationFormWrapper.find('.location-list-label-display').html(location.address.label);
            $('#AddressSearchModal').attr('aria-hidden', 'false').modal('hide');
        }
    });
});

function searchKeys(obj, keyToFind) {
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