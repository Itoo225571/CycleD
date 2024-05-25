function start_loading(overlay=true) {
	if(overlay){
		$('#loading-overlay').removeClass('d-none');
	}
	else{
		$('#loading-container').removeClass('d-none');
	}
}

//ローディング非表示
function remove_loading() {
	$('.loading-whole').addClass('d-none');
}