from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator

import uuid,json,os

User = get_user_model()

# 基底　クラス
class ScoreBase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    score = models.FloatField(null=True,default=None)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.score}"
    class Meta:
        abstract = True

DEFAULT_CHARACTER = 'Pigger'
def default_owned_characters():
    return [DEFAULT_CHARACTER]
# json内にあるキャラだけを選択できる
base_dir = os.path.dirname(__file__)
json_path = os.path.join(base_dir, 'data', 'players.json')
with open(json_path, 'r', encoding='utf-8') as f:
    players_data = json.load(f)
    valid_character_keys = {player['key'] for player in players_data}

class NIKIRunScore(ScoreBase):
    character = models.CharField(max_length=16, default=DEFAULT_CHARACTER)  # 選択したキャラ

    def clean(self):
        super().clean()
        if self.character not in valid_character_keys:
            raise ValidationError({
                'character': f"'{self.character}' は無効なキャラクターです"
            })
        
class NIKIRunUserInfo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    owned_characters = models.JSONField(default=default_owned_characters)               # 許可されたキャラ
    bronze_coin = models.IntegerField(default=0, validators=[MinValueValidator(0)])     # 集められる銅コイン枚数
    character_last = models.CharField(max_length=16, default=DEFAULT_CHARACTER)         # 最後に選択したキャラ

    def clean(self):
        super().clean()
        if self.character_last not in valid_character_keys:
            raise ValidationError({
                'character': f"'{self.character_last}' は無効なキャラクターです"
            })