function append_error(error_message) {
    const existingError = $('#error-list li').filter(function() {
        return $(this).text() === error_message;
    });
    if (existingError.length === 0) {
        const newItem = $('<li class="list-group-item list-group-item-danger"></li>').text(error_message);
        $('#error-list').append(newItem);
    }
    $('#error-list-container').show();
}
function append_warning(warning_message) {
    const existingError = $('#error-list li').filter(function() {
        return $(this).text() === warning_message;
    });
    if (existingError.length === 0) {
        const newItem = $('<li class="list-group-item list-group-item-warning"></li>').text(warning_message);
        $('#error-list').append(newItem);
    }
    $('#error-list-container').show();
}
function remove_error() {
    $('#error-list').empty();
    $('#error-list-container').hide();
}

function check_errors() {
    if ($('#error-list-modal li').length > 0) {
        $('#errorModal').modal('show');  // モーダルを表示
    } else {
        $('#errorModal').modal('hide');  // モーダルを非表示
    }  
}
// 手動でエラーを追加
function append_error_ajax(field_label,errors) {
    const errorList = $('#error-list-modal');
    $.each(errors,function(_,error) {
        errorList.append('<li class="list-group-item list-group-item-danger">' + field_label + ':<br>' + error + '</li>');  
    })
    check_errors();
}
function remove_error_ajax() {
    const errorList = $('#error-list-modal');
    errorList.empty();
}
$(document).ready(function() {
    check_errors();
});