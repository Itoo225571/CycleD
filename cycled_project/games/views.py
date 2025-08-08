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
from django.contrib.staticfiles import finders
from django.http import Http404

from rest_framework import views, viewsets, permissions, mixins, throttling, status
from rest_framework.response import Response

from .models import NIKIRunScore,NIKIRunUserInfo
from .serializers import NIKIRunScoreSerializer,NIKIRunUserInfoSerializer

import json
import os
import random

class TopView(LoginRequiredMixin,generic.TemplateView):
    template_name="games/top.html"

class NIKIRunView(LoginRequiredMixin,generic.TemplateView):
    template_name="games/run.html"

class RouletteView(generic.TemplateView):
    template_name = 'games/roulette.html'

class NIKIRunScoreViewSet(
    mixins.ListModelMixin,
    # mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet):

    serializer_class = NIKIRunScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [
        throttling.UserRateThrottle, 
        throttling.AnonRateThrottle,
    ]  # レート制限（ユーザー、匿名ユーザー）

    def get_queryset(self):
        if self.action == 'list':
            # スコア高い順に並べて上位10件だけ返す
            return NIKIRunScore.objects.exclude(score__isnull=True).order_by('-score')[:10]
        return NIKIRunScore.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        # 現在のスコアを取得
        instance = self.get_object()
        # 新しいスコアが現在のスコア以上かどうかを確認
        new_score = serializer.validated_data.get('score',0)
        if not instance.score or new_score > instance.score:
            # 新しいスコアが現在のスコア以上であれば更新
            serializer.save()
            serializer._is_newrecord = True  # ★ここで動的にフラグを立てる！

# 主に，コイン換金，キャラ購入用のViewSet
class NIKIRunUserInfoViewSet(
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet):

    serializer_class = NIKIRunUserInfoSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [
        throttling.UserRateThrottle, 
        throttling.AnonRateThrottle,
    ]  # レート制限（ユーザー、匿名ユーザー）

    def get_queryset(self):
        return NIKIRunUserInfo.objects.filter(user=self.request.user)  # 対象は自分のデータだけ

class NIKIRunDataAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [
        throttling.UserRateThrottle, 
        throttling.AnonRateThrottle,
    ]

    def get(self, request, format=None):
        try:
            user = request.user

            # JSONファイルの読み込み
            base_dir = os.path.dirname(__file__)
            json_path = os.path.join(base_dir, 'data', 'players.json')
            if not os.path.exists(json_path):
                raise Http404("キャラクターデータが見つかりません。")

            with open(json_path, 'r', encoding='utf-8') as f:
                players_data = json.load(f)

            # NIKIRunUserInfoを取得または作成
            user_info, _ = NIKIRunUserInfo.objects.get_or_create(user=user)
            user_info_serialized = NIKIRunUserInfoSerializer(user_info).data

            # NIKIRunScoreを取得または作成
            score_data, _ = NIKIRunScore.objects.get_or_create(user=user)
            score_serialized = NIKIRunScoreSerializer(score_data).data

            # キャラクターの所有情報付加
            owned_characters = user_info.owned_characters
            players_with_info = {}
            for player in players_data:
                key = player.get('key')
                if key in owned_characters:
                    players_with_info[key] = player
                else:
                    players_with_info[key] = {
                        'key': player.get('key'),
                        'price': player.get('price'),
                    }

            return Response({
                'players': players_with_info,
                'user_info': user_info_serialized,
                'score': score_serialized,
            })

        except FileNotFoundError:
            return Response({'detail': 'キャラクターデータが存在しません。'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except json.JSONDecodeError:
            return Response({'detail': 'キャラクターデータが壊れています。'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            print(str(e))
            return Response({'detail': f'予期しないエラーが発生しました: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
class BuyCharacterAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [
        throttling.UserRateThrottle, 
        throttling.AnonRateThrottle,
    ]

    def post(self, request):
        character = request.data.get('character')
        character_key = character.get('key')
        price = character.get('price')

        # json内にあるキャラだけを選択できる
        base_dir = os.path.dirname(__file__)
        json_path = os.path.join(base_dir, 'data', 'players.json')
        with open(json_path, 'r', encoding='utf-8') as f:
            players_data = json.load(f)
            valid_character_keys = {player['key'] for player in players_data}

        if not character_key in valid_character_keys:
            return Response({'detail': '指定されたキャラクターが存在しません'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = request.user
            user_info = NIKIRunUserInfo.objects.get(user=user)

            if character_key in user_info.owned_characters:
                return Response({'detail': 'すでに購入済みです'}, status=status.HTTP_409_CONFLICT)

            # 購入処理
            if not user.coin.sub(price):
                return Response({'detail': 'コインが足りません'}, status=status.HTTP_402_PAYMENT_REQUIRED)
            user_info.owned_characters.append(character_key)
            user_info.save()    # 更新
            
            # NIKIRunUserInfoを取得または作成
            user_info_serialized = NIKIRunUserInfoSerializer(user_info).data
            # 使えるキャラクターだけ情報を乗せる
            owned_characters = user_info.owned_characters
            players_with_info = {}
            for player in players_data:
                player_key = player['key']
                if player_key in owned_characters:
                    players_with_info[player_key] = player
                else:
                    players_with_info[player_key] = {
                        'key': player.get('key'),
                        'price': player.get('price'),
                    }

            return Response({
                'message': '購入に成功しました！',
                # 更新用のデータを添える
                'players': players_with_info,
                'user_info': user_info_serialized,
                # 使用できるようになったキャラ情報
                'character': players_with_info[character_key],
            }, status=status.HTTP_200_OK)

        except NIKIRunUserInfo.DoesNotExist:
            return Response({'detail': 'ユーザー情報が見つかりません'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PullGachaAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [
        throttling.UserRateThrottle, 
        throttling.AnonRateThrottle,
    ]

    def post(self, request):
        num = int(request.data.get('num', 1))  # 'num' をint型に変換、未指定時は1

        base_dir = os.path.dirname(__file__)
        json_path = os.path.join(base_dir, 'data', 'equipments.json')
        with open(json_path, 'r', encoding='utf-8') as f:
            equipments_data = json.load(f)

        price = 0  #とりあえずpriceは固定
        # レアリティごとの出現確率
        rarity_weights = {
            "R": 82,
            "SR": 15,
            "SSR": 3
        }

        try:
            user = request.user
            user_info = NIKIRunUserInfo.objects.get(user=user)

            # 購入処理
            if not user.coin.sub(price*num):
                return Response({'detail': 'コインが足りません'}, status=status.HTTP_402_PAYMENT_REQUIRED)
            
            results = []
            for i in range(num):
                result = draw_equipment(rarity_weights,equipments_data)

                user_info.add_equipment(result['id'])
                user_info.save()    # 更新
                results.append(result)

            return Response({
                # 更新用のデータを添える
                'user_info': NIKIRunUserInfoSerializer(user_info).data,
                # ガチャ結果
                'results': results,
            }, status=status.HTTP_200_OK)
            
        except NIKIRunUserInfo.DoesNotExist:
            return Response({'detail': 'ユーザー情報が見つかりません'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 抽選処理
def draw_equipment(rarity_weights,equipment_list):
    # レアリティを重み付きで抽選
    rarities = list(rarity_weights.keys())
    weights = list(rarity_weights.values())
    selected_rarity = random.choices(rarities, weights=weights, k=1)[0]

    # 該当するレアリティの装備リストからランダムに選ぶ
    candidates = [eq for eq in equipment_list if eq["rarity"] == selected_rarity]
    selected_equipment = random.choice(candidates)

    return selected_equipment