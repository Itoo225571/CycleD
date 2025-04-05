from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Prefetch
from django.views.decorators.csrf import csrf_protect

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status,viewsets
from rest_framework.decorators import action

from ..models import Diary,Location,TempImage,Good
from .cache_and_session import get_diaries

from datetime import timedelta
import logging
logger = logging.getLogger(__name__)

class HomeView(LoginRequiredMixin, generic.TemplateView):
    template_name="diary/home.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        data_all = get_diaries(request=self.request)
        # one_week_ago = timezone.now() - timedelta(weeks=1)
        # 公開された日記を取得
        diaries_public = data_all['diaries_public'].exclude(user=self.request.user)[:10]
        diary_ids = diaries_public.values_list('diary_id', flat=True)
        # **一括取得: ユーザーが「いいね」した Diary の ID をセットにする**
        liked_diary_ids = set(
            Good.objects.filter(
                user=self.request.user, 
                diary_id__in=diary_ids  # diary_idのリストを使ってフィルタリング
            ).values_list('diary_id', flat=True)  # IDのリストを取得
        )
        # 必要な情報をリストに格納(public用)
        diaries_data_public = [
            {
                "user": {
                    "username": diary.user.username,
                    "icon_url": diary.user.icon,
                },
                "date": diary.date,
                "diary_id": diary.diary_id,
                # サムネイルの画像URLを `.first()` を使って取得
                "image": diary.thumbnail_locations[0].image.url if diary.thumbnail_locations else None,
                "rotate_angle": diary.thumbnail_locations[0].rotate_angle if diary.thumbnail_locations else 0,
                "liked": diary.diary_id in liked_diary_ids,  # いいね済みか？
                # "good_count": diary.good.count(),  # いいね数
            }
            for diary in diaries_public
        ]

        # 自分の日記
        diaries_mine = data_all['diaries_mine']
        diaries_data_mine = [
            {
                "diary": diary,
                "good_count": diary.good.count()  # いいね数を追加
            }
            for diary in diaries_mine.order_by('-date_last_updated', '-date')[:10]
        ]

        context['diaries_public'] = diaries_data_public
        context['diaries_mine'] = diaries_data_mine
        context['diary_count'] = data_all.get('count',0)  # キャッシュを利用
        context['diary_count_ontheday'] = data_all.get('count_ontheday',0)  # キャッシュを利用
        return context
    
# good機能
class GoodViewSet(viewsets.ViewSet):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post', 'delete'], url_path='toggle')
    def toggle(self, request, pk=None):
        diary = get_object_or_404(Diary, diary_id=pk)

        if not diary.is_public and diary.user != request.user:
            return Response(
                {"status": "error", "message": "公開されていない日記にアクセスしています"},
                status=status.HTTP_403_FORBIDDEN
            )

        good_obj, created = Good.objects.get_or_create(user=request.user, diary=diary)
        if not created:
            good_obj.delete()
            liked = False
        else:
            liked = True

        return Response({
            "status": "success",
            "liked": liked,
            "good_count": diary.good.count(),
        })
