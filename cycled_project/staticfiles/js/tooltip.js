// bootstrapでのツールチップ有効化
$(document).ready(function () {
    $('[data-bs-toggle="tooltip"]').each(function () {
        new bootstrap.Tooltip(this);
    });
});
