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
		document.getElementById('modalForm-errors').style.display = 'block';
		document.getElementById('modalForm-normal').style.display = 'none';
		modal.show();
	}
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
			// 日付マスのクリック
			dateClick: function(info) {
				if (info.dayEl.classList.contains("fc-day-future")) {
					alert("選択できません。");
					return;
				} else {
					var modal = new bootstrap.Modal(document.getElementById('diaryModal'));
					modal.show();
					// 選択された日付をフォームにセットする
					const selectedDate = info.dateStr;
					const dateField = document.querySelector('#id_date_field');
					dateField.value = selectedDate;
					dateField.setAttribute('readonly', 'true'); // 読み取り専用に設定
					// タイトル用
					document.getElementById('selectedDate').textContent = formatDateJapanese(selectedDate);
				}
			},
			// イベントのクリック
			eventClick: (e) => {
				console.log("eventClick:", e.event.title);
			},
			// カレンダーに配置された時のイベント
			// TippyでTooltipを設定する
			eventDidMount: (e) => { 
				tippy(e.el, { 
					content: e.event.title,
				});
			},
		});
		// カレンダーを表示
		calendar.render();
	});

	// フォームの確認
	const form = document.getElementById('diaryForm');
    const dateInput = form.querySelector('[name="date"]');
    const locationsInput = form.querySelector('[name="locations"]');

    form.addEventListener('submit', function (event) {
        let hasError = false;
		document.getElementById('date-error').textContent = '';
        // document.getElementById('comment-error').textContent = '';
        document.getElementById('locations-error').textContent = '';
        // フィールドのバリデーション
        if (!dateInput.value) {
            hasError = true;
			document.getElementById('date-error').textContent = 'サイクリング日時は必須です。';
        }
		if (!locationsInput) {
            hasError = true;
			document.getElementById('locations-error').textContent = '地域は必須です。';
		}
        else if (!locationsInput.value) {
            hasError = true;
			document.getElementById('locations-error').textContent = '地域は必須です。';
        }
        // エラーがある場合はフォーム送信をキャンセル
        if (hasError) {
            event.preventDefault(); // フォームの送信をキャンセルする
        }
    });

	diaryModal.addEventListener('hidden.bs.modal', function () {
		document.getElementById('modalForm-errors').style.display = 'none';
		document.getElementById('modalForm-normal').style.display = 'block';
	});
});
