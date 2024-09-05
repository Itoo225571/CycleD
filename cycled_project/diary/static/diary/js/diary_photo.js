$(document).ready(function() {
    // const formMaxNum = $('#id_form-MAX_NUM_FORMS').val();
    $('#id_image').on('change', function(event) {
        const files = event.target.files;
        if (files) {
            append_error(`写真が選択されていません。`)
            return
        }
        $.each(files, function(index, file) {
            // ここでファイルに対して関数を実行
            console.log('ファイル名:', file.name);
            console.log('ファイルサイズ:', file.size);
            // 他の処理をここに追加
        });
    });
});

function handleImageFile(file) {
    // 例: ファイルの情報をコンソールに表示
    console.log(`選択されたファイル名: ${file.name}`);
    console.log(`ファイルサイズ: ${file.size} bytes`);
    
    // 例: 画像を表示する
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imgElement = document.createElement('img');
        imgElement.src = e.target.result;
        document.body.appendChild(imgElement); // 画像をページに追加
    };
    
    reader.readAsDataURL(file);
}