from typing import Any
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET
from django.utils.decorators import method_decorator
from django.conf import settings
from django_ratelimit.decorators import ratelimit
from django.core.cache import cache
from django.contrib import messages
from django.utils.safestring import mark_safe

from subs.get_pictures import get_pictures,get_random_url,is_bright,get_main_color

class TopView(generic.TemplateView):
    template_name="diary/top.html"
    def get(self, request, *args, **kwargs):
        from django.core.exceptions import PermissionDenied
        if not request.user.is_authenticated:
            # 認証されていないユーザーに対して 403 エラーを発生させる
            raise PermissionDenied
        if request.user.is_authenticated:
            return redirect('diary:home')  # 'home' にリダイレクト
        return super().get(request, *args, **kwargs)
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        url = get_cycle_picture(self.request)    #ランダムな画像を表示するやつ
        context['cycle_picture_url'] = url
        # context['is_bright'] = is_bright(url)     # 　明るさ判定
        html = '''
            ちゃりニキでは、写真をアップロードするだけでサイクリングのデータを簡単に記録できます。<br>
            サイクリングだけでなく、他の運動や健康管理、旅行の記録にも活用できます。<br>
            ちゃりニキはあなたの楽しく健康的な生活をサポートします。
        '''
        context['features'] = mark_safe(html)
        return context
    
class CacheMixin:
    @method_decorator(cache_page(60 * 15))  # 15分間キャッシュ
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

@ratelimit(key='user', rate='5/h', method='GET')
def _get_cycle_pictures(request):
    PEXELS_API_KEY = settings.PEXELS_API_KEY
    q = 'cycling nature'  # キーワードを設定
    urls = get_pictures(PEXELS_API_KEY, q)
    return urls

def get_cycle_picture(request):
    CACHE_KEY = "cycle_picture_urls"  # キャッシュのキー
    urls = cache.get(CACHE_KEY)
    try:
        if not urls:
            # キャッシュに無ければ、_get_cycle_picturesを実行して画像URLを取得
            urls = _get_cycle_pictures(request)
            # 取得したURLをキャッシュに保存（期限を設定してキャッシュに保存）
            cache.set(CACHE_KEY, urls, timeout=3600)  # 1時間のキャッシュ期限
        return get_random_url(urls)
    except Exception as e:  # Ratelimitedエラーとその他のすべての例外をキャッチ
        messages.warning(request, f"画像取得に失敗しました: {str(e)}")
        return None  # 例外発生時にNoneを返す