$(document).ready(function() {
    var map = make_map();
    appendLocations(url_getDiaries,map);
});

function make_map() {
    var point_of_view = [35.688544, 139.764692];
    var map = L.map('mapid').setView(point_of_view, 14);
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
    });
    osm.addTo(map);
    return map
}

function appendLocations(url_getDiaries, map) {
    return $.ajax({
        url: url_getDiaries,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            if (Array.isArray(data)) {
                setLocations(data,map)
            }
        },
        error: function(xhr, status, error) {
            console.error('データの取得に失敗しました:', error);
        }
    });
    function setLocations(data,map) {
        var dates = [];
        data.forEach(function(diary) {
            if (Array.isArray(diary.locations)) {
                var locations = diary.locations;
                var lastLoc = locations[locations.length - 1];
                map.setView([lastLoc.lat,lastLoc.lon],11);
                locations.forEach(function(location) {
                    // マーカーを個別に追加
                    var popup = `
                    <div class="popup-content">
                        <div class="popup-label">${location.label}</div>
                        <div class="popup-image">
                            <img src="${location.image}" alt="Image" style="width: 100%; height: auto; transform: rotate(${location.rotate_angle}deg);">
                        </div>
                    </div>
                    `;
                    dates.push(diary.date);
                    var opt = {tags:[diary.date]};
                    var marker = L.marker([location.lat, location.lon],opt)
                        .bindPopup(popup) // ラベルと画像が含まれたHTMLをポップアップに
                        .addTo(map);
                });
            }
        });
        L.control.tagFilterButton({
            data: dates,
            icon: '<i class="material-icons-outlined w-100 h-100 text-align-center" style="font-size:30px;">filter_alt</i>',
        }).addTo( map );
        return
    }
}