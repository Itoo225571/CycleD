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
function remove_error() {
    $('#error-list').empty();
    $('#error-list-container').hide();
}