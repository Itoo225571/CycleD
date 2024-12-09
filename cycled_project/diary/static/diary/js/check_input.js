function checkLineLimit(textarea) {
    var lines = textarea.value.split('\n');
    // 行数が3を超えている場合、改行を無効化
    if (lines.length > 3) {
        textarea.value = textarea.value.substr(0, textarea.value.lastIndexOf('\n'));
    }
}