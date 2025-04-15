function calc_scale($child,angle,minmax='min') {
	const $parent = $child.parent();

	const radian = angle * (Math.PI / 180);
	const cosA = Math.abs(Math.cos(radian));
	const sinA = Math.abs(Math.sin(radian));

	const widthChild = $child.width() * cosA + $child.height() * sinA;
	const heightChild = $child.width() * sinA + $child.height() * cosA;
	const widthParent = $parent.width();
	const heightParent = $parent.height();

    if (minmax === 'min') {
        return Math.min(widthParent/widthChild,heightParent/heightChild);
    } else {
        return Math.max(widthParent/widthChild,heightParent/heightChild);
    }
}

function adjust_imgs($base,minmax='min') {
    const $imgs = $base.find('img');
	$imgs.each(function(index, img) {
	  	// 画像がロード済みかチェック
        if (img.complete) {
            adjust_image(img,minmax);
        } else {
            // 画像のロードイベントを待つ
            $(img).on('load', function() {
                adjust_image(img,minmax);
            });
        }
	});
}

function adjust_image(img,minmax='min') {
    // 角度を取得
    var matrix = $(img).css('transform');
    var angle;
    if (!matrix || matrix === 'none') {
        angle = 0;
    }
    else {
        var values = matrix.split('(')[1].split(')')[0].split(',');
        var a = values[0];
        var b = values[1];
        // 回転角度を計算
        angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
    }

    var scale = calc_scale($(img), angle, minmax);
    // 画像のスケールを変更
    $(img).css('transform', `scale(${scale}) rotate(${angle}deg)`);
    // console.log('transform', `scale(${scale}) rotate(${angle}deg)`);
}
