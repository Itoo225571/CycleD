function setup_addressModal($locationFormWrapper, location) {
    $locationFormWrapper.find('.button-open-addressSearchModal, .button-edit-addressSearchModal').off('click').on('click',function(e) {
        // e.preventDefault();
        var $modal = $('#AddressSearchModal');
        pre_modalOpen();
        $modal.modal('show');

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
                    modalClose();
                })
                .catch(error => {
                    console.error('エラー:', error);
                });
        });
    
        $modal.find('.address-search-form').off("submit").on("submit", function(event) {
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
            setLocation(location);
            storeHistory(location);
        }

        function setLocation(location) {
            var $inputs = $locationFormWrapper.find('input');
            var $display = $locationFormWrapper.find('.location-list-label-display');
            applyLocationInput(location,$inputs);
            applyLocationDisplay(location,$display);
            modalClose();
        }

        function applyLocationInput(location,$inputs) {
            $.each(location, function(key, value) {
                if (typeof value === 'object' && value !== null) {
                    // オブジェクトの場合、そのプロパティを再帰的に処理
                    applyLocationInput(value, $inputs);
                } else {
                    // 正規表現を使って、name属性がlocations-数字-固有の文字形式かつ固有の文字がkeyと一致するinputを探す
                    var $input = $inputs.filter(function() {
                        var name = $(this).attr('name');
                        if (name) {
                            // 正規表現で最後の部分がkeyと一致するかチェック
                            var regex = new RegExp('locations-\\d+-' + key + '$');
                            return regex.test(name);
                        }
                        return false;
                    });
                    if ($input.length > 0) {
                        $input.val(value);  // 値を代入
                        $input.trigger('change');  // 手動でinputイベントを発火
                    }
                }
            });
        }
        function applyLocationDisplay(location,$display) {
            var label = searchKeys(location, 'label') || searchKeys(location, 'display');
            $display.html(label);
        }

        function pre_modalOpen() {
            var imageSrc = window.location.origin + location.image;
            const $imgField = $modal.find('.modal-diary-img-field');
            const html = `<img src="${imageSrc}" class="modal-diary-img rounded" alt="場所の写真">`;
            $imgField.html(html);

            displayHistory($('#id_keyword'),setLocation);   // 履歴表示

            // 検索要素を初期化
            $modal.find('#id_keyword').val('');
            $modal.find('#id_location-list').empty();
            $modal.find('#pagination').empty();
        }

        function modalClose() {
            const $diaryFormWrapper = $locationFormWrapper.closest('.diary-form-wrapper');
            const $button_openModal = $locationFormWrapper.find('.button-open-addressSearchModal');
            const $button_dropdown = $locationFormWrapper.find('.button-location-dropdown');
            $button_dropdown.focus();
            $button_openModal.hide();

            // $locationFormWrapper.find('.location-list-label-display').html(location.address.label);
            $modal.modal('hide');
        }

        // モーダルが閉じられたときのイベントリスナー
        $modal.on('hidden.bs.modal', function () {
            // delete $locationNewForm;
        });
    });
}

