// 祝日データを取得してカレンダーに追加する関数
function addHolidaysToCalendar() {
	return fetch('https://holidays-jp.github.io/api/v1/date.json')
		.then(response => response.json())
		.then(data => {
			var events = [];

			// 取得した祝日データをFullCalendarのイベント形式に変換
			for (const date in data) {
				events.push({
					title: data[date].replace(/ /g, '\n'),  // 祝日名
					start: date,        // 祝日の日付
					allDay: true,       // 終日イベントとして設定
					className: "holiday",
					holiday: date,
					display: 'background',
				});
			}
			return events;
		})
		.catch(error => {
			console.error('祝日データの取得に失敗しました:', error);
			return []; // 失敗時は空の配列を返す
		});
}

// 読み込まれたら実行する関数
document.addEventListener('DOMContentLoaded', function() {
	// 祝日データを取得してからカレンダーを初期化
	addHolidaysToCalendar().then(holidayEvents => {
		const calendarEl = document.getElementById('mycalendar');

		// カレンダーの初期設定
		const calendar = new FullCalendar.Calendar(calendarEl, {
			// カレンダーの種類
			initialView: "dayGridMonth",
			// 祝日イベントを追加
			events: holidayEvents,
			// 日本語化
			locale: 'ja',
			// 「日」削除
			dayCellContent: function(arg) {
				return arg.date.getDate();
			},
			// ヘッダー設定
			headerToolbar: {
				start: "prev",
				center: "title",
				end: "today,next"
			},
			height: "auto",
			// 日付マスのクリック
			dateClick: function(info) {
				if (info.dayEl.classList.contains("fc-day-future")) {
					alert("選択できません。");
					return;
				} else {
					console.log(info);
				}
			},
			// イベントのクリック
			eventClick: (e) => {
				console.log("eventClick:", e.event.title);
			},
			eventDidMount: (e) => { // カレンダーに配置された時のイベント
				tippy(e.el, { // TippyでTooltipを設定する
					content: e.event.title,
				});
			},
		});
		// カレンダーを表示
		calendar.render();
	});
});
