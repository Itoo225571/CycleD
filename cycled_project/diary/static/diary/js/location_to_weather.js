function sendLocationToServer(lat,lon) {
	var loading = '<div class="spinner-border text-dark m-4" id="address-loading" role="status"></div> '
	$('#getTodayWeather').append(loading);
	$('#getTomorrowWeather').append(loading);

	// ここからAjaxリクエストの処理
	var csrftoken = getCookie('csrftoken');
	
	$.ajax({
		method: "POST",
		url: "diary/ajax/location2weather/",
		headers: {
			"X-CSRFToken": csrftoken  // CSRFトークンも必要な場合
		},
		data: {
			'latitude': lat,
			'longitude': lon,
			'csrfmiddlewaretoken': csrftoken  // フォームの場合と同じように、CSRFトークンを含める
		},
		dataType: 'json',
		timeout:15000,
	})

	.done(function(data) {
		//Loadingアイコン削除
		$('#address-loading').remove();
		var today = '<p>{{ data.today.weather }}</p>'
		var tomorrow = '<p>{{ data.tomorrow.weather }}</p>'
		$('#getTodayWeather').append(today);
		$('#getTomorrowWeather').append(tomorrow);
	})

	.fail(function(jqXHR, textStatus, errorThrown) {
		//Loadingアイコン削除
		$('#address-loading').remove();
		// エラーメッセージを表示
		
		console.error("Error sending location data:", error);
	});

};