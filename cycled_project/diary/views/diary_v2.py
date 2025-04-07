from django.utils import timezone

from rest_framework import viewsets,status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated,BasePermission
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from ..models import Diary,Location,TempImage
from ..serializers import DiarySerializer,LocationSerializer

import datetime

class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user  # オブジェクトの所有者がリクエストユーザーと一致するか

class DiaryViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated, IsOwner]
    queryset = Diary.objects.all()  # ModelViewSetの場合、querysetを指定しておくと便利
    serializer_class = DiarySerializer

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