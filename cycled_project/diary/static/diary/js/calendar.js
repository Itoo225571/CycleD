// 祝日データを取得してカレンダーに追加する非同期関数
async function addHolidaysToCalendar() {
    try {
        const response = await fetch('https://holidays-jp.github.io/api/v1/date.json');
        const data = await response.json();
        
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
        
        return events; // 祝日データを返す
    } catch (error) {
        console.error('祝日データの取得に失敗しました:', error);
        throw new Error('祝日データの取得に失敗しました'); // エラーをスローしてまとめて処理
    }
}

// 非同期で日記データを取得してカレンダーに追加する関数
async function addDiariesToCalendar() {
    try {
        const response = await fetch(url_sendDiaries);
		// HTTPステータスコードが204の場合、空のデータを返す
		if (response.status === 204) {
			dont_show_again_popup('calendar',{
				title: '1年以内の日記が存在しません',
				body: '',
				icon: 'warning'
			});
			dont_show_again_popup('calendar',{
				title: '日記が存在しません',
				body: `<a href="${url_createDiaries}">ここから作成</a>`,
				icon: 'warning'
			});
			return [];  // 空の配列を返す
		}
        const data = await response.json();
        
        var events = [];
        // 取得した日記データをFullCalendarのイベント形式に変換
        data.forEach(diary => {
            let description, locations;
            
            if (diary.locations.length > 0) {
                description = diary.locations[0].label;
                locations = diary.locations;
            }
            
            // Diaryのデータをイベントに追加
            events.push({
                diary: diary,
                locations: locations,
                title: '',  // タイトルが空の場合はここで追加しても良い
                description: description,
                start: diary.date,  // 日記の日付
                allDay: true,       // 終日イベントとして設定
                className: `diary-event diary-rank-${diary.rank}`, // rankを含めたクラス名
                backgroundColor: 'rgba(255, 255, 255, 0)',  // 背景色を指定
                borderColor: 'rgba(255, 255, 255, 0)',      // 枠線の色も同じにする場合
            });
        });
        
        return events;  // イベントデータを返す
    } catch (error) {
        console.error('データの取得に失敗しました:', error);
        throw new Error('日記データの取得に失敗しました'); // エラーをスローしてまとめて処理
    }
}

// カレンダーにイベントを追加する非同期関数
async function addEventsToCalendar() {
    try {
        // addHolidaysToCalendar と addDiariesToCalendar の非同期結果を待機
        const [holidayEvents, diaryEvents] = await Promise.all([
            addHolidaysToCalendar(),
            addDiariesToCalendar()
        ]);
    
        // 祝日と日記のイベントを統合
        const events = [...holidayEvents, ...diaryEvents];
        return events;
    } catch (error) {
        // エラーが発生した場合、まとめて表示
        console.error('イベントの取得に失敗しました:', error);
        Swal.fire({
            title: 'エラー',
            text: error.message,  // エラーメッセージを表示
            icon: 'error',
            confirmButtonText: 'OK',
        });
        return []; // エラー発生時は空の配列を返す
    }
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
				initDiaryEdit(event_calendar,diary);

				// submitのnameを編集対象にする
				var $backContent = $('#diaryModal').find('.modal-content.flip-back');
				$backContent.find('.button-OK').attr('name', editContent);

				flip_card(this);
			});

			// 公開・非公開設定の切り替え
			// $frontContent.find('.button-to-toggle-ispublic').off('click').on('click', function(event) {
			// 	const $is_public = $('#id_is_public');
			// 	$is_public.val($is_public.val() === 'true' ? 'false' : 'true');

			// 	const $form = $('#id_diary-form');
			// 	send_form_ajax($form, event_calendar,diary, false);
			// });
			$frontContent.find('#delete-form').on('submit', function(event){
				event.preventDefault();
				Swal.fire({
					title: '本当に削除しますか？',
					text: "この操作は取り消せません。",
					icon: 'warning',
					showCancelButton: true,
					confirmButtonText: 'OK',
					cancelButtonText: 'Cancel',
					reverseButtons: true
				}).then((result) => {
					if (!result.isConfirmed) return;
					const form = $(this);
					const actionURL_mock = form.attr('action');
					const csrfToken = getCookie('csrftoken');

					if (actionURL_mock.includes(mockUuid)){
						var uuid = diary.diary_id;
						var actionURLNew = actionURL_mock.replace(mockUuid, uuid);
						
						$.ajax({
							url: actionURLNew,
							type: 'POST', // Djangoでは"疑似DELETE"にする
							headers: {
								'X-CSRFToken': csrfToken
							},
							data: {
								_method: 'DELETE' // これはDjango側で読み取る必要あり
							},
							success: function(response) {
								// alert('削除が完了しました');
								Swal.fire({
									title: '削除に成功しましたぁ!',
									icon: 'success',
									timer: 1500,
									showConfirmButton: false
								}).then(() => {
									// Swal が閉じられた後にページをリロード
									location.reload();
								});
							},
							error: function(xhr, status, error) {
								console.error('削除失敗:', xhr.responseText);
								Swal.fire({
									title: '削除に失敗しました',
									text: 'エラーコード: ' + xhr.status,  // xhr.status を表示
									icon: 'error',
									confirmButtonText: '閉じる'
								});
							}
						});
					} else {
						console.error('mockIDが含まれていません');
						alert('再度読み込みを行ってください');
					}
				});
			});
		}
		
		function initDiaryEdit(event_calendar,diary) {
			const $backContent = $('#diaryModal').find('.modal-content.flip-back');
			// $backContent.find('.diary-thumbnail-background').css({'transform': `rotate(0deg)`,});	//角度を初期化

			// 日付を表示
			$backContent.find('.modal-title').html(`<span id="selectedDate-back">${formatDateJapanese(diary.date)}</span>`);
			var locations = diary.locations;
			// サムネイル用の画像
			var loc_thumbnail = locations.filter(location => location.is_thumbnail === true)[0];
			locations = locations.filter(location => location.is_thumbnail !== true);
			locations.unshift(loc_thumbnail);

			// 初期値
			$('#id_comment').val(diary.comment);
			$('#id_date').val(diary.date);
			// $('#id_is_public').val(diary.is_public);
			$('#id_is_public').prop('checked', diary.is_public);	//checkboxはこの形式
			// $frontContent.find('.icon-visibility').attr('data-visible', diary.is_public);

			// Management関連
			$('#id_locations-TOTAL_FORMS').val(diary.locations.length);
			$('#id_locations-INITIAL_FORMS').val(diary.locations.length);

			var diaryEditHtml = '';
			locations.forEach((location, index) => {
				var $location_base = $('#empty-form-locations').clone();

				$location_base.find('input').not('[type="radio"]').each(function() {
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
				// HTMLの中にある全ての __prefix__ を index に置換
				$location_base.html($location_base.html().replace(/__prefix__/g, index));
				// radiobuttonグループからclone元を省く
				$location_base.html($location_base.html().replace(/__empty__/g, ''));

				$location_base.find('.location-img-url').val(location.image);
				$location_base.find('.location-list-label-display').html(`<text>${location.label}</text>`);
				if (location.is_thumbnail) {
					// attrで直接checkedをつける
					$location_base.find('.diary-location-radiobutton').prop('checked', true).attr('checked', 'checked');

					// サムネイルをセット
					$backContent.find('img.diary-thumbnail').attr('src', location.image);
					$backContent.find('.diary-thumbnail-background').css({'transform': `rotate(${location.rotate_angle}deg)`,});	//角度を初期化
				}

				diaryEditHtml += $location_base.html().replace(/__prefix__/g, `${index}`);
			});
			
			$backContent.find('.diary-location-label-field').html(diaryEditHtml);
			// $backContent.find('.diary-comment-field').html(form_comment);

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
				send_form_ajax($form,event_calendar,diary);
			});

			// label変更ボタン
			var $locations = $backContent.find('.diary-location-item');
			$locations.find('.button-edit-location-label').off('click').on('click', function(e) {
				const $location = $(this).closest('.diary-location-item');
				const $surface = $location.find('.location-list-label-display text');
				const $radioButton = $location.find('.diary-location-radiobutton');
				const $label_input = $location.find('.class_locations-label');
				// var $surface = $radioButton.find('.location-label-surface');
				// 一旦全てリセット
				$locations.not($location).each(function(e) {
					const $surface_each = $(this).find('.location-list-label-display text');
					const $label_input_each = $(this).find('.class_locations-label');
					decide($surface_each,$label_input_each,is_confirmed=false)
				})
				if ($surface.is(':visible')) edit($surface,$label_input);
				else decide($surface,$label_input,is_confirmed=true);

				$label_input.on('change', function() {
					// labelinputの変化はsurfaceのみに反映
					$surface.text($(this).val());
				});
				// Enterキーを押された時のフォーム送信を無効化
				$label_input.on('keydown', function(e) {
					if (e.key === 'Enter') {
						e.preventDefault();  // フォーム送信を無効化
						decide($surface,$label_input,is_confirmed=true);
					}
				});
				// is_comfirmed: 確定かどうか
				function decide($surface,$label_input,is_confirmed) {
					// 決定版の場合
					if (is_confirmed) {
						// 何らかの入力があった場合
						if ($label_input.val()) {
							// labelinputのcopyの変化は surfave,inputどちらにも反映
							$surface.text($label_input.val());
							$label_input.val($label_input.val());
						}
						$label_input.attr('type', 'hidden');
						$surface.show();  // textを表示
					} else {
						$label_input.attr('type', 'hidden');
						$surface.show();  // textを表示
					}
				}
				function edit($surface,$label_input) {
					$surface.hide();  // textを隠す
					$label_input.attr('type', 'text');
					$label_input.val(''); // 中身を削除
					$label_input.focus(); // 入力フィールドにフォーカスを当てる
					if (!$radioButton.is(':checked')) {
						$radioButton.prop('checked', true);
						$radioButton.trigger('change');
					}
				}
			});
			// label変更ボタン以外が押されたら戻る
			$backContent.find('.diary-location-label-field').find('button').not('.button-edit-location-label').on('click', function() {
				// 全てのinputを非表示,surfaceを表示する
				const $location = $(this).closest('.diary-location-item');
				$location.find('.class_locations-label').attr('type','hidden');
				$location.find('.location-list-label-display text').show();
			});

			// Location削除
			$backContent.find('.diary-location-label-field').find('.button-delete-location').off('click').on('click', function(e){
				const $container = $(this).closest('.diary-location-label-field');
				const $location = $(this).closest('.diary-location-item');
				const $radioButton = $location.find('.diary-location-radiobutton');
				
				const $delete_inputs = $container.find('*[id^="id_locations"][id$="DELETE"]');
				const $delete_input = $location.find('*[id^="id_locations"][id$="DELETE"]');
				const count = $delete_inputs.filter(function() {
					return $(this).val() === 'false' || $(this).val() === '' || $(this).val() == null;
				}).length;
				if (count > 1) {
					$delete_input.val(true);
					$location.hide();
					// チェック移動
					if ($radioButton.is(':checked')) {
						var $nextRadiobutton = $container.find('.diary-location-item').filter(':visible').not($location).eq(0).find('.diary-location-radiobutton');
						$nextRadiobutton.prop('checked', true);
						$nextRadiobutton.trigger('change');
					}
				} else {
					alert('これ以上は削除できませんよ');
				}
			});
			// 住所変更
			$backContent.find('.diary-location-label-field').find('.button-edit-addressSearchModal').off('click').on('click', function(){
				const $location = $(this).closest('.diary-location-item');
				setup_addressModal($location);
			});

		}
		
		function send_form_ajax($form, event_calendar, diary, is_flip_card = true) {
			const $backContent = $('#diaryModal').find('.modal-content.flip-back');
			var method = $form.find('input[name="_method"]').val() || $form.prop("method");
			var actionURL_mock = $form.prop("action");
			if (actionURL_mock.includes(mockUuid)){
				var uuid = diary.diary_id;
				var actionURLNew = actionURL_mock.replace(mockUuid, uuid);
				$.ajax({
					method: method,
					url: actionURLNew,
					data: $form.serialize(), //nameをくっつける
					dataType: 'json',
					timeout: 6000,
					headers: {
						"X-CSRFToken": getCookie('csrftoken')  // CSRFトークンも必要な場合
					},
				})
				.done(function (diary_new) {
					var $button = $backContent.find('.button-OK');
					initDiaryContent(event_calendar, diary_new);
					initDiaryEdit(event_calendar,diary_new);
					if (is_flip_card) {
						flip_card($button);
					}
				})
				.fail(function (jqXHR, textStatus, errorThrown) {
					console.log("AJAXリクエストが失敗しました:", errorThrown);
					let errors = jqXHR.responseJSON;
					if (errors) {
						let errorMessagesSet = new Set();  // 重複しないエラーメッセージを格納するSet
				
						// diary_errorsが存在する場合、そのエラーメッセージをSetに追加
						if (errors.diary_errors) {
							for (let key in errors.diary_errors) {
								if (errors.diary_errors.hasOwnProperty(key)) {
									errors.diary_errors[key].forEach(function(error) {
										errorMessagesSet.add(error);  // Setに追加（重複は自動的に排除）
									});
								}
							}
						}
				
						// location_errorsが存在する場合、そのエラーメッセージをSetに追加
						if (errors.location_errors) {
							errors.location_errors.forEach(function(locationError) {
								for (let key in locationError) {
									if (locationError.hasOwnProperty(key)) {
										locationError[key].forEach(function(error) {
											errorMessagesSet.add(error);  // Setに追加（重複は自動的に排除）
										});
									}
								}
							});
						}
				
						// Setに格納されたエラーメッセージをHTMLリストとして表示
						if (errorMessagesSet.size > 0) {
							let errorMessages = '';
							errorMessagesSet.forEach(function(error) {
								errorMessages += `<li class="list-group-item">${error}</li>`;  // <li>で囲んでリスト化
							});
				
							Swal.fire({
								icon: 'error',
								title: 'エラーが発生しました',
								html: `<ul class="list-group list-group-flush">${errorMessages}</ul>`,  // HTML形式でリスト表示
								confirmButtonText: 'OK'
							});
						}
					}
				});									
			} else {
				alert('ページをリロードしてください')
			}
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
