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

// Diaryデータを取得してカレンダーに加える関数
function addDiariesToCalendar() {
	return fetch(url_sendDiaries)
        .then(response => response.json())
        .then(data => {
            var events = [];
            // 取得した日記データをFullCalendarのイベント形式に変換
            data.forEach(diary => {
				// console.log(diary)
				// 最初の地名をタイトルとする
				let description;
				if (diary.locations.length > 0){
					description = diary.locations[0].label
				}
                // Diaryのデータをイベントに追加
                events.push({
                    title: '',
					description: description,
                    start: diary.date,                     // 日記の日付
                    allDay: true,                          // 終日イベントとして設定
                    className: "diary-event",
					backgroundColor: 'rgba(255, 255, 255, 0)',  // 背景色を指定
					borderColor: 'rgba(255, 255, 255, 0)',      // 枠線の色も同じにする場合
					iconHtml: '<span class="material-icons icon-bike">directions_bike</span>',  // カスタムプロパティとしてアイコンを設定
                });
            });
            return events;
        })
        .catch(error => {
            console.error('データの取得に失敗しました:', error);
            return []; // 失敗時は空の配列を返す
        });
}

// カレンダーにイベントを追加する関数
function addEventsToCalendar() {
    // 非同期関数を実行し、すべてのプロミスが解決されるのを待つ
    return Promise.all([addHolidaysToCalendar(), addDiariesToCalendar()])
        .then(([holidayEvents, diaryEvents]) => {
            // イベントを統合
            const events = [...holidayEvents, ...diaryEvents];
            return events;
        });
}

// 日本の年月日に変換する関数
function formatDateJapanese(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月は0始まりなので+1
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

// 読み込まれたら実行する関数
document.addEventListener('DOMContentLoaded', function() {
	var diaryModal = document.getElementById('diaryModal');
	if (window.hasFormErrors) {
		// モーダルを開く
		var modal = new bootstrap.Modal(document.getElementById('diaryModal'));
		$('.modal-errors').css('display', 'block');
		$('.modal-normal').css('display', 'none');
		modal.show();
	}
	// 祝日データを取得してからカレンダーを初期化
	addEventsToCalendar().then(allEvents => {
		const calendarEl = document.getElementById('mycalendar');
		// カレンダーの初期設定
		const calendar = new FullCalendar.Calendar(calendarEl, {
			// カレンダーの種類
			initialView: "dayGridMonth",
			// 祝日イベントを追加
			events: allEvents,
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
			// 日にちの範囲
			validRange: function() {
				const today = new Date();
				const lastYear = new Date();
				const nextYear = new Date();
				lastYear.setFullYear(today.getFullYear() - 1, 0, 1); 
				nextYear.setMonth(today.getMonth() + 3); 
				// 日付をYYYY-MM-DD形式に変換
				const formatDate = (date) => date.toISOString().split('T')[0];
				return {
					start: formatDate(lastYear),
					end: formatDate(nextYear)
				};
			},
			dayMaxEvents: true, // trueにすると月表示の際のイベントの数が曜日セルの高さに制限されイベントが多い場合は+more表記でpopoverで表示される 5未満にしたい場合は数値を指定する
			showNonCurrentDates: true, // 月表示で先月や来月の日にち表示
			// 日付マスのクリック
			dateClick: function(info) {
				if (info.dayEl.classList.contains("fc-day-future")) {
					alert("選択できません。");
					return;
				} else {
					// その日付にイベントがあるかチェック
					const calendarEvents = info.view.calendar.getEvents();
					const eventsOnDate = calendarEvents.filter(event => {
						// イベントの日付とクリックされた日付を比較
						return event.startStr === info.dateStr;
					});
					if (eventsOnDate.length > 0) {
						showDiaryModalEdit(info.dateStr);
					}
					else { 
						showDiaryModalNew(info.dateStr);
					}
				}
			},

			// イベントのクリック
			eventClick: function(info) {
				const eventDate = info.event.startStr;  // イベントの日付を取得
				showDiaryModalNew(eventDate);
			},
			// カレンダーに配置された時のイベント
			// TippyでTooltipを設定する
			eventDidMount: (e) => { 
				const description = e.event.extendedProps.description;
				if (description) {  // contentが空でないか確認
					tippy(e.el, { 
						content: description,
					});
				}
				// 自転車アイコンを追加
				if (e.event.extendedProps.iconHtml) {
					e.el.querySelector('.fc-event-title').innerHTML = e.event.extendedProps.iconHtml;
				}
			},
			
		});
		// モーダル表示の共通処理(新規作成)
		function showDiaryModalNew(dateStr) {
			var modal = new bootstrap.Modal(document.getElementById('diaryModal'));
			modal.show();
			// 選択された日付をフォームにセットする
			const dateField = document.querySelector('#id_date_field');
			dateField.value = dateStr;
			dateField.setAttribute('readonly', 'true'); // 読み取り専用に設定
			// タイトル用
			document.getElementById('selectedDate').textContent = formatDateJapanese(dateStr);
		}
		// モーダル表示の共通処理(編集)
		function showDiaryModalEdit(dateStr) {
			var modal = new bootstrap.Modal(document.getElementById('diaryModal'));
			modal.show();
			// フォームにセットする
			const dateField = document.querySelector('#id_date_field');
			dateField.value = dateStr;
			dateField.setAttribute('readonly', 'true'); // 読み取り専用に設定
			// タイトル用
			document.getElementById('selectedDate').textContent = formatDateJapanese(dateStr);
			// const titleField = document.querySelector('#id_date_field');
		}
		// カレンダーを表示
		calendar.render();
	});

	diaryModal.addEventListener('hidden.bs.modal', function () {
		$('.modal-errors').css('display', 'none');
		$('.modal-normal').css('display', 'block');
	});
});
