from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework import viewsets,status,mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated,BasePermission
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView

from ..models import Diary,Location,TempImage
from ..forms import DiaryEditForm,LocationEditFormSet
from ..serializers import DiarySerializer,LocationSerializer
from ..views.cache_and_session import update_diaries

import datetime

class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user  # オブジェクトの所有者がリクエストユーザーと一致するか

class DiaryViewSet(mixins.ListModelMixin,
                   mixins.DestroyModelMixin,
                #    mixins.UpdateModelMixin,
                   viewsets.GenericViewSet):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = DiarySerializer

    def get_queryset(self):
        # 認証済みユーザーのものだけに絞る（IsOwner があるけど念のため）
        base_qs = Diary.objects.filter(user=self.request.user)
        if self.action == 'list':
            one_year_ago = timezone.now().date() - datetime.timedelta(days=365)
            return base_qs.filter(date__gte=one_year_ago)
        return base_qs
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        if not queryset.exists():
            return Response(status=status.HTTP_204_NO_CONTENT)
        return super().list(request, *args, **kwargs)

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        update_diaries(self.request)  # キャッシュ更新

    # ユーザーが所有するすべての日記を削除するカスタムアクション
    @action(detail=False, methods=['delete'], url_path='delete-all')
    def delete_all(self, request):
        # ユーザーが所有するすべてのDiaryを削除
        user = request.user
        diaries = Diary.objects.filter(user=user)
        if not diaries.exists():
            return Response({"message": "日記が存在しません"}, status=status.HTTP_404_NOT_FOUND)
        # 日記が存在する場合は削除
        count, _ = diaries.delete()
        update_diaries(self.request)  # キャッシュ更新
        return Response({"message": f"日記（{count}コ）を削除しました"}, status=status.HTTP_200_OK)

# updateのみはこちらでやる
class DiaryUpdateAPIView(APIView):
    def post(self, request, pk):
        diary = get_object_or_404(Diary, pk=pk, user=request.user)
        locations = Location.objects.filter(diary=diary)
        diaryForm = DiaryEditForm(request.POST, instance=diary)
        locationFormset = LocationEditFormSet(request.POST, queryset=locations,instance=diary, prefix='locations')
        # locationFormset.instance = diary  # ← これが重要
        if diaryForm.is_valid() and locationFormset.is_valid():
            # フォームが有効ならデータを保存
            diary = diaryForm.save()
            locationFormset.save()
            diary_data = DiarySerializer(diary).data

            # キャッシュ更新
            update_diaries(request)
            return Response(diary_data,status=status.HTTP_200_OK)

        return Response({
            'diary_errors': diaryForm.errors,
            'location_errors': locationFormset.errors,
        }, status=status.HTTP_400_BAD_REQUEST)