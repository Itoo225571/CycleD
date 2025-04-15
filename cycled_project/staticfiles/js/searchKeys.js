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