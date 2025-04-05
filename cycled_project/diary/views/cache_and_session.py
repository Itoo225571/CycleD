from django.db.models import Prefetch
from django.core.cache import cache

from ..models import Diary,Location,TempImage,Good

def update_diaries(request,whose=['mine','public']):
    key = 'diaries_for_display'
    diaries = {}

    # 自分の情報はsessionに保存
    if 'mine' in whose:
        diaries_mine = Diary.objects.filter(user=request.user)
        diary_count = diaries_mine.count()
        diary_count_ontheday = diaries_mine.filter(rank=0).count()
        data = {
            'diaries_mine': diaries_mine,
            'count': diary_count,
            'count_ontheday': diary_count_ontheday
        }
        request.session[key] = data
        diaries.update(data)

    # 全体の情報はcacheに保存
    if 'public' in whose:
        thumbnail_location = Prefetch(
            'locations',
            queryset=Location.objects.filter(is_thumbnail=True),
            to_attr='thumbnail_locations'
        )
        diaries_public = (
            Diary.objects.filter(is_public=True)
            # .exclude(user=request.user)   # 除去しない
            .order_by('-date_last_updated', '-date')
            .prefetch_related(thumbnail_location, 'user')
        )
        data = {
            'diaries_public': diaries_public,
        }
        cache.set(key, data, timeout=3600)  # 1時間のキャッシュ
        diaries.update(data)
    return diaries

def get_diaries(request,whose=['mine','public']):
    key = 'diaries_for_display'
    request.session.get(key,None)
    cache.get(key, None)
    # whoseの中に対象の名前があったらそれをセッションもしくはキャッシュにより取得(失敗したらupdateを使う)
    session_data = (request.session.get(key,None) or update_diaries(request, ['mine'])) if 'mine' in whose else {}
    cached_data = (cache.get(key, None) or update_diaries(request, ['public'])) if 'public' in whose else {}
    return {**session_data, **cached_data}