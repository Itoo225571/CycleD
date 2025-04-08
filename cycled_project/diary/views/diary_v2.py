from django.utils import timezone

from rest_framework import viewsets,status,mixins
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

class DiaryViewSet(mixins.ListModelMixin,
                   mixins.DestroyModelMixin,
                   mixins.UpdateModelMixin,
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