// カレンダーに表示するイベント
const events = [
	{
		id: "a",
		start: "2022-02-02",
		end: "",
		title: "節分",
		description: "悪い鬼を追い払い福を招く",
		backgroundColor: "red",
		borderColor: "red",
		editable: true
	},
	{
		id: "b",
		start: "2022-02-03",
		end: "",
		title: "立春",
		description: "二十四節気の一つ",
		backgroundColor: "green",
		borderColor: "green",
		editable: true
	},
	{
		id: "c",
		start: "2022-02-08",
		end: "",
		title: "針供養",
		description: "古くなった針などを神社に納めて供養する",
		backgroundColor: "blue",
		borderColor: "blue",
		editable: true
	},
];

document.addEventListener('DOMContentLoaded', function() {
	const calendarEl = document.getElementById('mycalendar');

	// カレンダーの初期設定
	const calendar = new FullCalendar.Calendar(calendarEl, {
		// カレンダーの種類
		initialView: "dayGridMonth",
		// ここで後から祝日イベントを追加
        events: [], 
		// 日本語化
		locale: 'ja',
		// 「日」削除
		dayCellContent: function(arg){
			return arg.date.getDate();
		},
		headerToolbar: {
			start: "prev",
			center: "title",
			end: "today,next"
		},
		height: "auto",
        // 日付マスのクリック
		dateClick: function (info) {
			if (info.dayEl.classList.contains("fc-day-future")) {
				alert("選択できません。");
				return;
			}
			else{
				console.log(info)
			}
		},
        // イベントのクリック
		eventClick: (e)=>{
			console.log("eventClick:", e.event.title);
		},
        eventDidMount: (e)=>{// カレンダーに配置された時のイベント
            tippy(e.el, {// TippyでTooltipを設定する
                content: e.event.extendedProps.description,
            });
		},
	});

	// 祝日データをAPIから取得して、カレンダーに追加
	fetch('https://holidays-jp.github.io/api/v1/date.json')
		.then(response => response.json())
		.then(data => {
			const events = [];

			// 取得した祝日データをFullCalendarのイベント形式に変換
			for (const date in data) {
				events.push({
					title: data[date],  // 祝日名
					start: date,        // 祝日の日付
					allDay: true,       // 終日イベントとして設定
					color: 'red',        // 祝日を赤色で表示
				});
			}

			// 祝日イベントをカレンダーに追加
			calendar.addEventSource(events);

			// カレンダーを表示
			calendar.render();
		})
		.catch(error => {
			console.error('祝日データの取得に失敗しました:', error);
		});
});