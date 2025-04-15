$(document).ready(function() {
    var map = make_map();
    appendLocations(url_getDiaries,url_createDiaries, map);
});

function make_map() {
    var map = L.map('mapid');
    
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
        maxZoom: 19,
        tileSize: 256,
        zoomOffset: 0,
        subdomains: ['a', 'b', 'c']  // 複数のサーバーを利用して読み込みを分散
    }).addTo(map);
    
    osm.addTo(map);

    // 📍 現在位置を表示するボタンを追加
    L.control.locate({
        position: 'topright',  // ボタンの位置
        setView: 'untilPanOrZoom',  // ユーザーが操作するまで現在位置を追尾
        keepCurrentZoomLevel: true,  // 現在のズームレベルを維持
        drawCircle: true,  // 現在位置の範囲を円で表示
        drawMarker: true,  // 現在位置をマーカーで表示
        showPopup: false,  // ポップアップを表示しない
        locateOptions: {
            enableHighAccuracy: true  // 高精度の位置情報を取得
        }
    }).addTo(map);
    return map;
}

async function appendLocations(url_getDiaries, url_createDiaries, map) {
    try {
        const data = await fetchDiaries(url_getDiaries);
        if (data.length === 0) {
            await dont_show_again_popup('map', {
                title: '日記が存在しません',
                body: `<a href="${url_createDiaries}">ここから作成</a>`,
                icon: 'info',
            });
            map.setView([35.6762, 139.6503], 8); // dataが空の場合に東京の座標を指定
        } else {
            const markers = setLocations(data, map);
            make_filter(map, markers); // フィルターを追加
        }
    } catch (error) {
        console.error('データの取得に失敗しました:', error);
    }
}
// fetchDiariesは非同期でデータを取得する関数
function fetchDiaries(url) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            method: 'GET',
            data: {
                filter_days: 365  // ← 直近1年分のデータを取得
            },
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                if (jqXHR.status === 204) {
                    resolve([]); // データが存在しない場合、空配列を返す
                } else {
                    resolve(data); // 正常にデータがあれば、データを返す
                }
            },
            error: function(xhr, status, error) {
                reject(error); // エラーがあればreject
            }
        });
    });
}


function setLocations(data, map) {
    var markers = L.markerClusterGroup(); // クラスタグループを作成

    data.forEach(function(diary) {
        if (Array.isArray(diary.locations)) {
            var locations = diary.locations;
            var lastLoc = locations[locations.length - 1];
            map.setView([lastLoc.lat, lastLoc.lon], 11);
            
            locations.forEach(function(location) {
                var popup = `
                <div class="popup-content">
                    <div class="popup-label">${location.label}</div>
                    <div class="popup-image">
                        <img src="${location.image}" alt="Image" style="width: 100%; height: auto; transform: rotate(${location.rotate_angle}deg);">
                    </div>
                </div>
                `;
                var opt = {tags: getTags(diary.date)};
                
                // マーカーを作成し、クラスタグループに追加
                var marker = L.marker([location.lat, location.lon], opt)
                    .bindPopup(popup)
                markers.addLayer(marker); // クラスタグループに追加
            });
        }
    });

    // クラスタグループを地図に追加
    map.addLayer(markers);
    return markers; // `make_filter` に渡せるように修正
}

// ラジオボタンの作成
function make_filter(map,markerLayer) {
    var originalMarkers = markerLayer.getLayers().map(function(layer) {
        return layer;
    });
    var filterContainer = L.control({ position: 'topleft' });
    filterContainer.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
        
        // ドロップダウンボタンのHTML
        div.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-light p-1" type="button" id="filterDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="material-icons-round vertical-align-middle">
                        filter_alt
                    </i>
                </button>
                <ul class="dropdown-menu" aria-labelledby="filterDropdown" id="tagFilterForm">
                    <li>
                        <label for="withinOneYear" class="dropdown-item">
                            <input type="radio" id="withinOneYear" name="tag" value="withinOneYear" checked>
                            1年以内
                        </label>
                    </li>
                    <li>
                        <label for="thisMonth" class="dropdown-item">
                            <input type="radio" id="thisMonth" name="tag" value="thisMonth">
                            今月
                        </label>
                    </li>
                    <li>
                        <label for="thisWeek" class="dropdown-item">
                            <input type="radio" id="thisWeek" name="tag" value="thisWeek">
                            今週
                        </label>
                    </li>
                    <li>
                        <label for="today" class="dropdown-item">
                            <input type="radio" id="today" name="tag" value="today">
                            今日
                        </label>
                    </li>
                </ul>
            </div>
        `;
        return div;
    };
    filterContainer.addTo(map);

    // ラジオボタン変更時のイベントリスナー
    $(document).on('change', '#tagFilterForm', function(event) {
        updateMarkers(event.target.value);
    });
    // フィルタリング関数
    function updateMarkers(selectedTag) {
        markerLayer.clearLayers();
        originalMarkers.forEach(function(marker) {    
            // selectedTag が marker.options.tags 配列に含まれているかをチェック
            if (Array.isArray(marker.options.tags) && marker.options.tags.includes(selectedTag)) {
                markerLayer.addLayer(marker);
            }
        });
    }
    // ページ読み込み時に初期化
    updateMarkers('withinOneYear'); // 初期値として'今年'を選択して表示
}

function getTags(date) {
    // 現在の日付を取得
    const today = dayjs();
    var locationDate = dayjs(date);
    // タグを設定
    var tags = [];

    // 今日の日付と比較
    if (locationDate.isSame(today, 'day')) tags.push('today');
    // 1週間以内かどうかをチェック
    if (locationDate.isSame(today, 'week')) tags.push('thisWeek');
    // 今月かどうかをチェック
    if (locationDate.isSame(today, 'month')) tags.push('thisMonth');
    // 1年以内かどうかをチェック
    if (locationDate.isAfter(today.subtract(1, 'year')) && locationDate.isBefore(today)) {
        tags.push('withinOneYear');
    }

    return tags
}