// navigator.geolocationをチェックして、GetLocation APIをサポートしているかの確認
var isGeolocSupport;
if (navigator.geolocation) {
    isGeolocSupport = true;
} else {
    isGeolocSupport = false;
}

function GetAndSendLocation() {
    if (isGeolocSupport) {
        navigator.geolocation.getCurrentPosition(function(position){
            // 位置情報が取得できた場合
            var request = new XMLHttpRequest();
            var latitude = position.coords.latitude;
            var longitude = position.coords.longitude;
            // 何か処理する
            sendLocationToServer(latitude,longitude);
        },
        function(error){
            console.log("Geolocation is not supported by this browser.");
        },{
            // オプション
            enableHighAccuracy: true,
            timeout: 30 * 1000,
            maximumAge: 60 * 1000
        });
    }
};

// サーバーに位置情報を送信する関数
function sendLocationToServer(latitude, longitude) {
    // CSRFトークンを取得
    var csrftoken = getCookie('csrftoken');
    
    $.ajax({
        type: "POST",
        url: "/diary/ajax/location2weather/",
        headers: {
            "X-CSRFToken": csrftoken  // CSRFトークンをヘッダーに追加
        },
        data: {
            'latitude': latitude,
            'longitude': longitude,
            'csrfmiddlewaretoken': csrftoken  // フォームの場合と同じように、CSRFトークンを含める
        },
        dataType: 'json',
        success: function(data) {
            document.getElementById("getCurrentWeather").innerHTML         = data.current.weather
            document.getElementById("getTodayWeather").innerHTML         = data.today.weather
            document.getElementById("getTomorrowWeather").innerHTML        = data.tomorrow.weather
        },
        error: function(xhr, status, error) {
            console.error("Error sending location data:", error);
        }
    });
}

// CSRFトークンを取得する関数
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            // クッキーが名前と一致する場合、値を取得
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}