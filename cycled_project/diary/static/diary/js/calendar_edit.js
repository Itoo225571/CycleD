import { set_location } from './set_location.js';
import { MyDiary } from './address_diary.js';

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
				// 最初の地名をタイトルとする
				let description,locations;
				if (diary.locations.length > 0){
					description = diary.locations[0].label;
					locations = diary.locations;
				}
                // Diaryのデータをイベントに追加
                events.push({
					diary: diary,
					locations: locations,
                    title: '',
					description: description,
                    start: diary.date,                     // 日記の日付
                    allDay: true,                          // 終日イベントとして設定
                    className: `diary-event diary-rank-${diary.rank}`, // rankを含めたクラス名
					backgroundColor: 'rgba(255, 255, 255, 0)',  // 背景色を指定
					borderColor: 'rgba(255, 255, 255, 0)',      // 枠線の色も同じにする場合
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
	// 祝日データを取得してからカレンダーを初期化
	addEventsToCalendar().then(allEvents => {
		const calendarEl = document.getElementById('mycalendar');
		// カレンダーの初期設定
		const calendar = new FullCalendar.Calendar(calendarEl, {
			initialDate: sessionStorage.getItem('diaryDate') || new Date().toISOString().split('T')[0], // なかったら今日にする
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
				center: "",
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
				const formatDate = (date) => {
					// タイムゾーンのオフセットを考慮して日付を調整
					const offset = date.getTimezoneOffset();
					const adjustedDate = new Date(date.getTime() - offset * 60000);
					return adjustedDate.toISOString().split('T')[0];
				};
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
					const allEvents = info.view.calendar.getEvents();
					// 日記に限定
					const diaryEvents = allEvents.filter(event => event.classNames.includes('diary-event'));
					const eventsOnDate = diaryEvents.filter(event => {
						// イベントの日付とクリックされた日付を比較
						return event.startStr === info.dateStr;
					});
					if (eventsOnDate.length > 0) {
						let event = eventsOnDate[0]
						showDiaryModalEdit(event);
					}
					else { 
						showDiaryModalNew(info.dateStr);
					}
				}
			},

			// イベントのクリック
			eventClick: function(info) {
				const event = info.event;
				if (event.classNames.includes('diary-event')) {
					showDiaryModalEdit(event);
				} else {
					showDiaryModalNew(info.dateStr);
				}
			},
			viewDidMount: function(info) {
				var title = info.view.title; // 現在のビューのタイトルを取得
				$('.calendarTitle').text(title); // jQueryでタイトルを設定
			},
			datesSet: function(info) {
				var title = info.view.title; // 現在のビューのタイトルを取得
				$('.calendarTitle').text(title); // jQueryでタイトルを設定			
			},			
		});
		// モーダル表示の共通処理
		function showDiaryModalBase(dateStr){
			// リセット
			$('#id_locations-INITIAL_FORMS').val(0);
			var modal = new bootstrap.Modal(document.getElementById('diaryModal'));
			modal.show();
			// 選択された日付をフォームにセットする
			const dateField = document.querySelector('#id_date');
			dateField.value = dateStr;
			dateField.setAttribute('readonly', 'true'); // 読み取り専用に設定
			sessionStorage.setItem('diaryDate', dateStr);  // sessionStorageに保存
		}
		// 新規作成
		function showDiaryModalNew(dateStr) {
			showDiaryModalBase(dateStr);
			// タイトル用
			var title = document.getElementById('diaryModalLabel');
			title.innerHTML = `日記の作成 - <span id="selectedDate">${formatDateJapanese(dateStr)}</span>`
			// ボタン表示非表示
			$("#id-diary-new-button").show();
			$("#id-diary-edit-button").hide();
			$("#id-diary-delete-button").hide();
		}
		// 編集
		function showDiaryModalEdit(event) {
			const formatDate = (date) => {
				// タイムゾーンのオフセットを考慮して日付を調整
				const offset = date.getTimezoneOffset();
				const adjustedDate = new Date(date.getTime() - offset * 60000);
				return adjustedDate.toISOString().split('T')[0];
			};
			showDiaryModalBase(formatDate(event.start));
			var diary = event.extendedProps.diary
			// const commentField = document.querySelector('#id_comment_field');
			// dateField.value = diary.comment;
			var initialFormCount = 0;
			diary.locations.forEach(item => {
				set_location(item,true);
				initialFormCount += 1;
			});
			// Form初期の数は最初に記述
			$('#id_locations-INITIAL_FORMS').val(initialFormCount);
			MyDiary.setPk(diary.diary_id);
			// タイトル用
			var title = document.getElementById('diaryModalLabel');
			title.innerHTML = `日記の編集 - <span id="selectedDate">${formatDateJapanese(diary.date)}</span>`
			// const titleField = document.querySelector('#id_date');
			// ボタン表示非表示
			$("#id-diary-new-button").hide();
			$("#id-diary-edit-button").show();
			$("#id-diary-delete-button").show();
		}
		// カレンダーを表示
		calendar.render();
	});

	diaryModal.addEventListener('hidden.bs.modal', function () {
		// フォームをリセット
		// const diaryForm = document.getElementById('diaryForm'); // フォームのIDを使って取得
		// diaryForm.reset();
		$('#formset-body').html(''); // formsetリセット
		MyDiary.resetPk(); //setしたpkをリセット
		$('#error-normal').empty(); // エラーをクリア

		// 強制的にモーダルを閉じる
		var backdrop = document.querySelector('.modal-backdrop');
		if (backdrop) {
			backdrop.remove(); // バックドロップを削除
		}
		document.body.classList.remove('modal-open'); // モーダルのオープンクラスを削除
		document.body.style.paddingRight = ''; // 余分なスタイルをリセット
		document.body.style.overflow = ''; // 直接スクロールスタイルをリセットする
	});
});


