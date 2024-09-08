function append_error(error_message) {
    const newItem = $('<li class="list-group-item list-group-item-danger"></li>').text(error_message);
    $('#error-list').append(newItem);
    $('#error-list-container').show();
}
function remove_error() {
    $('#error-list').empty();
    $('#error-list-container').hide();
}