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

// URLクエリパラメータを取得する関数
function getQueryParam(param) {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(param);
}

// 読み込まれたら実行する関数
$(document).ready(function() {
	var $diaryModal = $('#diaryModal');
	const initialDate = getQueryParam('diary_date');

	// 祝日データを取得してからカレンダーを初期化
	addEventsToCalendar().then(allEvents => {
		const calendarEl = document.getElementById('mycalendar');
		// カレンダーの初期設定
		const calendar = new FullCalendar.Calendar(calendarEl, {
			initialDate: initialDate,
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
					// alert("選択できません。");
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
						let event_calendar = eventsOnDate[0]
						showDiaryModal(event_calendar);
					}
				}
			},

			// イベントのクリック
			eventClick: function(info) {
				const event_calendar = info.event;
				if (event_calendar.classNames.includes('diary-event')) {
					showDiaryModal(event_calendar);
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
		// Diary表示
		function showDiaryModal(event_calendar) {
			var diary = event_calendar.extendedProps.diary;
			// 表示を表にする
			const $flipContainer = $('#diaryModal').find('.flip');
			$flipContainer.removeClass('flipped');
			
			initDiaryContent(event_calendar,diary);
			const modal = new bootstrap.Modal(document.getElementById('diaryModal'));
			modal.show();
		}
		function initDiaryContent(event_calendar,diary) {
			// カレンダー内のDiaryを最新のものに更新
			event_calendar.setExtendedProp('diary', diary);

			const $frontContent = $('#diaryModal').find('.modal-content.flip-front');
			// タイトル用
			var title = $frontContent.find('.modal-title');
			title.html(`
				<span id="selectedDate-front">
					${formatDateJapanese(diary.date)}
				</span>
			`);

			var locations = diary.locations;
			var loc_thumbnail = locations.filter(location => location.is_thumbnail === true)[0];
			// loc_thumbnail を配列から取り出す
			locations = locations.filter(location => location.is_thumbnail !== true);
			// loc_thumbnail を配列の最初に追加
			locations.unshift(loc_thumbnail);

			const diaryContentHtml = `
				<div class="diary-ispublic-field d-flex align-items-center px-2 py-1" data-visible="${diary.is_public}">
					<i class="material-icons-outlined icon-visibility me-2 fs-3"></i>
					<span class="text-muted">${diary.is_public ? "この日記は公開されています" : "この日記は非公開です"}</span>
				</div>
				<div class="diary-comment-field px-2 py-1 m-1 ${diary.comment ? '' : 'd-none'}">
					${convertLineBreaks(diary.comment)}
				</div>
				<div class="diary-thumbnail-field text-center">
					<img class="diary-image fade-anime" loading="lazy" src="${locations[0].image}"
					style="transform: rotate(${loc_thumbnail.rotate_angle}deg)">
				</div>
				<div class="diary-locations-field mt-3">
					${locations.map((location, index) => `
						<div class="diary-location-item">
							<input class="diary-location-radiobutton visually-hidden" 
								type="radio" id="location${index}" 
								name="location" value="${location.label}"
								${index === 0 ? 'checked' : ''}>
							<label for="location${index}" class="location-label w-100 text-start">
								<text>${location.label}</text>
							</label>
							<input type="hidden" value="${location.image}" class="location-img-url">
							<input type="hidden" value="${location.rotate_angle}" class="location-rotate_angle">
						</div>
					`).join('')}
				</div>
			`;
			$frontContent.find('.diary-content').html(diaryContentHtml);
			
			// jQueryでラジオボタンの変更イベントを監視し、画像を更新
			$frontContent.find('.diary-location-radiobutton').on('change', function() {
				// 親要素の中にある隠しフィールドから画像のURLを取得
				const newImageSrc = $(this).closest('.diary-location-item').find('.location-img-url').val();
				const rotateAngle = $(this).closest('.diary-location-item').find('.location-rotate_angle').val();
				$frontContent.find('.diary-image').css('opacity', 0); // フェードアウト
				var scale = calc_scale($frontContent.find('.diary-image'),rotateAngle)

				setTimeout(() => {
					$frontContent.find('.diary-image').attr('src', newImageSrc); // 画像を切り替え
					$frontContent.find('.diary-image').css({'transform': `rotate(${rotateAngle}deg) scale(${scale})`,}); // 角度変更
					setTimeout(() => {
						$frontContent.find('.diary-image').css('opacity', 1); // フェードイン
					}, 200); // 0.1秒待機
				}, 500); // フェードアウト時間に合わせる
			});

			// 編集部分を初期化
			initDiaryEdit(event_calendar,diary);
			$frontContent.find('.button-to-edit').off('click').on('click', function() {
				const editContent = this.getAttribute('data-edit-content');
				limit_display(editContent);
				initDiaryEdit(event_calendar,diary);

				// submitのnameを編集対象にする
				var $backContent = $('#diaryModal').find('.modal-content.flip-back');
				$backContent.find('.button-OK').attr('name', editContent);

				flip_card(this);
			});

			// 公開・非公開設定の切り替え
			$frontContent.find('.button-to-toggle-ispublic').off('click').on('click', function(event) {
				const $is_public = $('#id_is_public');
				$is_public.val($is_public.val() === 'true' ? 'false' : 'true');

				const $form = $('#id_diary-form');
				send_form_ajax($form, event_calendar, false);
			});
			$frontContent.find('form').off('submit').on('submit', function(event) {
				event.preventDefault();
				var actionURL = $(this).attr('action');
				if (actionURL.includes('delete-diary')) {
					if (confirm('本当に削除しますか？')) {
						if (actionURL.includes(mockUuid)){
							var uuid = diary.diary_id;
							actionURL = actionURL.replace(mockUuid, uuid);
							$(this).attr('action', actionURL);
							this.submit();  // フォームを送信する
						} else {
							console.error('mockIDが含まれていません');
						}
					}
				}
			})
		}
		
		function initDiaryEdit(event_calendar,diary) {
			const $backContent = $('#diaryModal').find('.modal-content.flip-back');
			// $backContent.find('.diary-thumbnail-background').css({'transform': `rotate(0deg)`,});	//角度を初期化

			$backContent.find('.modal-title').html(`<span id="selectedDate-back">${formatDateJapanese(diary.date)}</span>`);
			var locations = diary.locations;
			var loc_thumbnail = locations.filter(location => location.is_thumbnail === true)[0];
			locations = locations.filter(location => location.is_thumbnail !== true);
			locations.unshift(loc_thumbnail);

			// 初期値
			$('#id_comment').val(diary.comment);
			$('#id_date').val(diary.date);
			// 表のアイコンも合わせる
			$('#id_is_public').val(diary.is_public);
			// $frontContent.find('.icon-visibility').attr('data-visible', diary.is_public);

			const form_comment = $('#id_comment');	//先にfield取得を行わなければdiaryEdit内にあったときに消える
			// Management関連
			$('#id_locations-TOTAL_FORMS').val(diary.locations.length);
			$('#id_locations-INITIAL_FORMS').val(diary.locations.length);

			var diaryEditHtml = '';
			locations.forEach((location, index) => {
				var location_base = $('#empty-form-locations').clone();
				location_base.find('input').each(function() {
					let $input = $(this);
					let name = $input.attr('name');
					name = name.replace('locations-__prefix__-', '');
					const value = searchKeys(location,name);
					// 値を取得して設定する
					if (value) {
						$input.val(value);	
					}
					$input.attr('type', 'hidden');
				});
				var isChecked = location.is_thumbnail ? 'checked' : '';
				var radioButtonHtml = `
				    <input class="diary-location-radiobutton visually-hidden" 
						type="radio" id="location-edit-__prefix__-thumbnail" 
						name="locationRadiobuttonEdit" ${isChecked}>
					<label for="location-edit-__prefix__-thumbnail" class="location-label w-100 text-start"></label>
				`;
				location_base.find('.diary-location-item').append(radioButtonHtml);
				location_base.find('.location-img-url').val(location.image);
				location_base.find('.location-label').html(`<text>${location.label}</text>`);
				if (location.is_thumbnail) {
					location_base.find('.diary-location-radiobutton').prop('checked', true);
					$backContent.find('.diary-thumbnail').attr('src', location.image);
					$backContent.find('.diary-thumbnail-background').css({'transform': `rotate(${location.rotate_angle}deg)`,});	//角度を初期化
				}

				diaryEditHtml += location_base.html().replace(/__prefix__/g, `${index}`);
			});
			
			$backContent.find('.diary-locations-field').html(diaryEditHtml);
			// $backContent.find('.diary-comment-field').html(form_comment);
			set_label_field(); //label編集周りの初期化

			$backContent.find('.diary-location-radiobutton').on('change', function() {
				var $checkedLocation = $(this).closest('.diary-location-item');
				// サムネイル変更 (全部falseにしてから選択したものをtrueに)
				$backContent.find('[id*="is_thumbnail"]').val(false);
				$checkedLocation.find('[id*="is_thumbnail"]').val(true);

				// 回転させる
                var $angle = $checkedLocation.find('[id*="rotate_angle"]');
                var angle = parseInt($angle.val(), 10);
				$angle.val(angle);
				// 親要素の中にある隠しフィールドから画像のURLを取得
				const newImageSrc = $checkedLocation.find('.location-img-url').val();

				var $img = $backContent.find('.diary-thumbnail');
				$img.css('opacity', 0); // 透明にする（スペースは保持）
				setTimeout(function(){
					$backContent.find('.diary-thumbnail-background').css({'transform': `rotate(${angle}deg)`,});
					$img.attr('src', newImageSrc);					
				},300);
				setTimeout(function(){
					$img.css('opacity', 1); // srcを更新し、フェードイン
				},800);
			});
			$backContent.find('.diary-img-rotate-button').off('click').on('click', function() {
                var $checkedLocation = $('.diary-location-radiobutton:checked').closest('.diary-location-item');

                var $img_background = $backContent.find('.diary-thumbnail-background');
                var $angle = $checkedLocation.find('[id*="rotate_angle"]');
                var angle = parseInt($angle.val(), 10);
                angle += 90; // ボタンがクリックされるたびに90度回転
                $img_background.css({'transform': `rotate(${angle}deg)`,}); // CSSのtransformを更新
                $angle.val(angle);
            });
			$backContent.find('.button-cancel').off('click').on('click', function() {
				flip_card(this);
			});
			$backContent.find('form').off('submit').on('submit', function(event_form) {
				const $form = $(this);
				event_form.preventDefault();
				send_form_ajax($form,event_calendar);
			});

			function set_label_field() {
				const $locations_field = $backContent.find('.diary-locations-field');
				const $labels_field = $backContent.find('.diary-labels-field');
				// 既存のラベルフィールドをクリア
				$labels_field.empty();
				$labels_field.html('<div class="text-center"><img class="diary-image fade-anime mb-3" loading="lazy"></div>');

				$locations_field.children().each(function (index, locationForm) {
					const imgSrc = $(locationForm).find('.location-img-url').val();
					const isThumbnail = $(locationForm).find('*[id^="id_locations"][id$="is_thumbnail"]').val();
					const rotateAngle = $(locationForm).find('*[id^="id_locations"][id$="rotate_angle"]').val();

					var isChecked = '';
					if (isThumbnail) {
						const imageSrc = $(locationForm).find('.location-img-url').val();
						isChecked = 'checked';
						$labels_field.find('.diary-image').attr('src', imageSrc);
						$labels_field.find('.diary-image').css({'transform': `rotate(${rotateAngle}deg)`,});	//角度を初期化
					}
					var $label_input = $(locationForm).find('*[id^="id_locations"][id$="label"]');
					$label_input.addClass('w-100');
					var $radioButton = $(`
						<div class="diary-location-label-item">
							<input type="hidden" class="location-label-imgSrc" value="${imgSrc}">
							<input type="radio"
								class="diary-location-label-radiobutton visually-hidden" 
								id="location-edit-${index}-label" 
								name="locationRadiobuttonEditLabel" ${isChecked}>
							<label for="location-edit-${index}-label" class="location-label w-100 text-start py-3">
								<div class="d-flex align-items-center justify-content-between w-100">
									<div class="location-surface-field flex-grow-1 overflow-hidden">
										<span class="location-label-surface me-2 w-100">
											${$label_input.val()}
										</span>
									</div>
									<div class="location-buttons-field flex-shrink-0">
										<div class="d-flex align-items-center" style="font-size: 20px;">
											<button type="button" class="button-edit-addressSearchModal button-text px-1 d-flex align-items-center">
												<i class="iconify text-primary" data-icon="material-symbols:edit-location-alt-outline-rounded"></i>
											</button>
											<button type="button" class="button-edit-location-label button-text px-1 d-flex align-items-center">
												<i class="iconify text-dark" data-icon="bx:rename"></i>
											</button>
											<button type="button" class="button-delete-location button-text px-1 d-flex align-items-center">
												<i class="iconify text-danger" data-icon="material-symbols:delete-outline-rounded"></i>
											</button>
										</div>
									</div>
								</div>
							</label>
						</div>
					`);
					// $radioButton.find('.location-label-surface').after($label_input);
					const $label_input_copy = $('<input type="hidden" class="label-input-copy w-100">');
					$radioButton.find('.location-label-surface').after($label_input_copy);
					
					const $delete_input = $(locationForm).find('*[id^="id_locations"][id$="DELETE"]');
					$radioButton.find('.location-label-surface').after($delete_input);
					
					$radioButton.find('.diary-location-label-radiobutton').on('change', function() {
						var $img = $labels_field.find('.diary-image');
						$img.css('opacity', 0); // フェードアウト
						setTimeout(() => {
							$img.attr('src', imgSrc); // 画像を切り替え
							$img.css({'transform': `rotate(${rotateAngle}deg)`,});	//角度を合わせる
							setTimeout(() => {
								$img.css('opacity', 1); // フェードイン
							}, 200); // 0.1秒待機
						}, 500); // フェードアウト時間に合わせる
					});
					// ラベル編集関連
					$radioButton.find('.button-edit-location-label').off('click').on('click', change_label_edit);

					// Location削除
					$radioButton.find('.button-delete-location').off('click').on('click', function(){
						const $delete_inputs = $labels_field.find('*[id^="id_locations"][id$="DELETE"]');
						const count = $delete_inputs.filter(function() {
							return $(this).val() === 'true'; // val() が true のものをフィルタリング
						}).length;
						if (count + 1 < diary.locations.length) {
							$delete_input.val(true);
							$radioButton.hide();
							// チェック移動
							if ($radioButton.find('.diary-location-label-radiobutton').is(':checked')) {
								var $nextRadiobutton = $labels_field.find('.diary-location-label-item').filter(':visible').not($radioButton).eq(0).find('.diary-location-label-radiobutton');
								$nextRadiobutton.prop('checked', true);
								$nextRadiobutton.trigger('change');
							}
						} else {
							alert('これ以上は削除できませんよ');
						}
					});

					// 住所変更button
					$radioButton.find('.button-edit-addressSearchModal').off('click').on('click', function(){
						setup_addressModal($(locationForm));
					});

					$label_input_copy.on('keypress', function(event) {
						if (event.key === "Enter") {
							event.preventDefault();
							change_label_edit();
						}
					});
					function change_label_edit(){
						var $surface = $radioButton.find('.location-label-surface');
						if ($surface.is(':visible')) {
							$surface.hide();  // textを隠す
							$label_input_copy.attr('type', 'text');
							$label_input_copy.val(''); // 中身を削除
							$label_input_copy.focus(); // 入力フィールドにフォーカスを当てる
							if (!$radioButton.find('.diary-location-label-radiobutton').is(':checked')) {
								$radioButton.find('.diary-location-label-radiobutton').prop('checked', true);
								$radioButton.find('.diary-location-label-radiobutton').trigger('change');
							}
						} else {
							// labelinputのcopyの変化は surfave,inputどちらにも反映
							$surface.text($label_input_copy.val());
							$label_input.val($label_input_copy.val());
							$label_input_copy.attr('type', 'hidden');
							$surface.show();  // textを表示
						}
					}
					$label_input.on('change', function() {
						// labelinputの変化はsurfaceのみに反映
						var $surface = $radioButton.find('.location-label-surface');
						$surface.text($(this).val());
					});
					$radioButton.find('button').not('.button-edit-location-label').on('click', function() {
						// 全てのinputを非表示,surfaceを表示する
						$labels_field.find('.label-input-copy').attr('type','hidden');
						$labels_field.find('.location-label-surface').show();
					});

					$labels_field.append($radioButton);
				});
			}
		}
		
		function send_form_ajax($form, event_calendar, is_flip_card = true) {
			const $backContent = $('#diaryModal').find('.modal-content.flip-back');
			
			$.ajax({
				method: $form.prop("method"),
				url: $form.prop("action"),
				data: $form.serialize(), //nameをくっつける
				dataType: 'json',
				timeout: 6000,
				headers: {
					"X-CSRFToken": getCookie('csrftoken')  // CSRFトークンも必要な場合
				},
			})
			.done(function (data) {
				if (data.success) {
					var $button = $backContent.find('.button-OK');
					diary = data.diary;        // DiaryをDB反映後のものに変更
					initDiaryContent(event_calendar, diary);
					initDiaryEdit(event_calendar,diary);
					if (is_flip_card) {
						flip_card($button);
					}
				} else {
					alert('リクエストが失敗しました');
					// Diaryのエラーを表示
					if (data.errors.Diary) {
						console.log("Diary Errors:");
						console.log(data.errors.Diary);
					}
					// Locationsのエラーを表示
					if (data.errors.Locations) {
						console.log("Locations Errors:");
						console.log(data.errors.Locations);
					}
				}
			})
			.fail(function (jqXHR, textStatus, errorThrown) {
				console.log("AJAXリクエストが失敗しました。");
			});
		}
		
		// カレンダーを表示
		calendar.render();
		showDiaryModalByDate(initialDate);

		function showDiaryModalByDate(dateStr) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
				return; // dateまで指定していない形式は無視
			}
			// 全イベントを取得
			const allEvents = calendar.getEvents();
			// 日記イベントをフィルタリング
			const diaryEvents = allEvents.filter(event => event.classNames.includes('diary-event'));
			// 指定された日付のイベントを検索
			const eventsOnDate = diaryEvents.filter(event => event.startStr === dateStr);
			if (eventsOnDate.length > 0) {
				// 最初のイベントに対して処理を実行
				const event_calendar = eventsOnDate[0];
				showDiaryModal(event_calendar);
			} else {
				console.log("指定された日付にイベントがありません");
			}
		}
	});

	$diaryModal.on('shown.bs.modal', function () {
		// モーダルが開かれたときに実行したい処理
		adjust_imgs($(this));
	});	

	$diaryModal.on('hidden.bs.modal', function () {
		// 強制的にモーダルを閉じる
		var backdrop = $diaryModal.find('.modal-backdrop');
		if (backdrop) {
			backdrop.remove(); // バックドロップを削除
		}
		document.body.classList.remove('modal-open'); // モーダルのオープンクラスを削除
		document.body.style.paddingRight = ''; // 余分なスタイルをリセット
		document.body.style.overflow = ''; // 直接スクロールスタイルをリセットする
	});
});

function flip_card(button){
    const $flipContainer = $(button).closest('.flip');  // ボタンから一番近い.flipコンテナを取得
	$flipContainer.toggleClass('flipped');
	adjust_imgs($('#diaryModal'))
}

function convertLineBreaks(text) {
    return text.replace(/\n/g, "<br>");  // 改行文字を <br> に変換
}

function limit_display(content_name) {
	const $editContainer = $('#diaryModal').find('.modal-content.flip-back').find('.diary-edit-container');
	if ($editContainer) {
		$editContainer.children().each(function(index, element) {
			const $child = $(element);
			// content name がedit contentに含まれているかチェック
			var name = $child.data('edit-content');
			if (name && name.includes(content_name)) {
				$child.show();
			}
			else {
				$child.hide();
			}
		});
	}
	else {
		console.log('全ての要素を表示します');
		$editContainer.children().show();
	}
}
