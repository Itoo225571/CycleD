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

    # def update(self, request, *args, **kwargs):
    #     # 受け取ったPUTデータの確認
    #     # print("受け取ったPUTデータ:", request.data)

    #     # Diaryのインスタンスを取得
    #     instance = self.get_object()

    #     # シリアライザにデータを渡す
    #     serializer = self.get_serializer(instance, data=request.data, partial=True)

    #     # シリアライザの検証
    #     if serializer.is_valid():
    #         location_serializer = LocationSerializer(location_instance, data=request.data, partial=True)
    #         if location_serializer.is_valid():
    #             location_serializer.save()

    #         # Diaryを保存
    #         serializer.save()

    #         return Response(serializer.data)
    #     else:
    #         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
            return Response(diary_data,status=status.HTTP_200_OK)
        
        return Response({
            'diary_errors': diaryForm.errors,
            'location_errors': locationFormset.errors,
        }, status=status.HTTP_400_BAD_REQUEST)