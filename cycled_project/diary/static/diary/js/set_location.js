export function set_location(data,is_exist=false){
    // 現在のフォームの総数を取得
    const formsetBody = $('#formset-body');
    const formCountReal = formsetBody.children().length;
    const formCountVisible = formCountReal - $(".formset_fields_deleted").length;
    const maxnumForms = $('#id_locations-MAX_NUM_FORMS');

    const formMax = parseInt(maxnumForms.val()/2) ;
    if (formCountVisible < formMax){
        var formsetClassName = "formset_fields formset_fields_new";
        if(is_exist) {
            formsetClassName = "formset_fields formset_fields_exist";
        }
        // empty-form の HTML を取得し、__prefix__ を現在のフォーム数で置換
        let newFormHtml = $('#empty-form').html().replace(/__prefix__/g, formCountReal);
        let $newFormHtml = $(`<tr id="locations-${formCountReal}" class="${formsetClassName}">`).append($('<td>').html(newFormHtml));
        let prefix = `locations-${formCountReal}-`;
        
        // フォームの内容を変更
        $newFormHtml.find('input').each(function() {
            let $input = $(this);
            let name = $input.attr('name');
            name = name.replace(prefix, '');
            if (name=="id"){
                name = "location_id"
            }
            const value = searchKeys(data,name);
            // data オブジェクトから値を取得して設定する
            if (value) {
                $input.val(value);
                if (name == "label") {
                    var label_HTML = 
                        `<span class="fa-stack fa-lg">
                            <i class="fa-solid fa-circle fa-stack-2x" style="color: #cdcdcd;"></i>
                            <i class="fa-solid fa-location-dot fa-stack-1x" ></i>
                        </span>
                        ${value}
                        <button type="button" class="bi bi-trash delete-location" style="color: red;"></button>
                        `;
                    $newFormHtml.find('.label-display').html(label_HTML);
                }
            }
            $input.attr('type', 'hidden');
        });

        // 削除ボタンにクリックイベントを設定
        $newFormHtml.find('.delete-location').on('click', function() {
            var parent = $(this).closest('tr');
            var num = parent.attr('id');
            num = parseInt(num.replace('locations-', ''));
            var newformCount = formsetBody.children().length;
            if (parent.hasClass('formset_fields_new')) {
                // 後ろから順番にIDを更新
                for (let i = newformCount - 1; i > num; i--) {
                    $(`#formset-body [id *= 'locations-${i}']`).each(function() {
                        let $element = $(this);
                        // ID更新
                        let currentId = $element.attr('id');
                        let newId = currentId.replace(`locations-${i}`, `locations-${i-1}`);
                        $element.attr('id', newId);
                        // nameも更新
                        let currentName = $element.attr('name');
                        if (currentName) {
                            let newName = currentName.replace(`locations-${i}`, `locations-${i-1}`);
                            $element.attr('name', newName);
                        }
                    });
                }
                parent.remove(); // 親の<tr>要素を削除
            } else {
                var $deleteInput = parent.find(`input#id_locations-${num}-DELETE`);
                // $deleteInput.prop('checked', true);
                $deleteInput.val(true);
                parent.addClass('formset_fields_deleted'); // 削除されたことにするクラス
                parent.hide(); //削除しない
            }
        });
        formsetBody.append($newFormHtml);
    }
    else{
        alert(`サイクリング場所は${formMax}個まで追加できます`)
        return
    }    

    // キーを探す関数
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
}