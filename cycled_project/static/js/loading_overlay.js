function start_loading(overlay=true,loadingObject=null) {
	if (loadingObject) {
		loadingObject.removeClass('d-none');
	}
	else {
		if(overlay){
			$('#loading-overlay').removeClass('d-none');
		}
		else{
			$('#loading-container').removeClass('d-none');
		}
	}
}

//ローディング非表示
function remove_loading() {
	$('.loading-whole').addClass('d-none');
}