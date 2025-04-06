from django.utils import timezone

from rest_framework import viewsets,status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from ..models import Diary,Location,TempImage
from ..serializers import DiarySerializer,LocationSerializer

import datetime

class DiaryViewSet(viewsets.ViewSet):
    # 一覧の取得
    def list(self, request):
        # クエリパラメータ 'filter_days' を取得(ない場合はここ1年のDiaryを取得する)
        filter_days = request.GET.get('filter_days', 365)
        # Diaryをコンテキストに含める
        # すべてのDiaryと関連するLocationを一度に取得
        current_date = timezone.now().date()
        one_year_ago = current_date - datetime.timedelta(days=int(filter_days))
        diaries = Diary.objects.prefetch_related('locations').filter(
            date__gte=one_year_ago,
            date__lte=current_date,
            user=request.user,
        )
        # 日記がない場合の処理
        if not diaries.exists():
            return Response(
                {"detail": "指定された期間内に日記が存在しません"},
                status=status.HTTP_204_NO_CONTENT  # データがない場合でも成功
            )
        serializer = DiarySerializer(diaries, many=True)
        return Response(serializer.data,status=status.HTTP_200_OK)

    # 更新
    def update(self, request, pk=None):
        try:
            diary = Diary.objects.get(diary_id=pk,user=request.user)
        except Diary.DoesNotExist:
            raise NotFound("指定された日記が見つかりません")
        serializer = DiarySerializer(diary, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data,status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # 削除
    def destroy(self, request, pk=None):
        try:
            diary = Diary.objects.get(diary_id=pk,user=request.user)
        except Diary.DoesNotExist:
            raise NotFound("指定された日記が見つかりません")
        diary.delete()
        return Response(
            {'detail': '日記を削除しました'},
            status=status.HTTP_204_NO_CONTENT
        )