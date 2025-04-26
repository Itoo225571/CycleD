from django.db import models
from django.contrib.auth import get_user_model

import uuid

User = get_user_model()

# 基底　クラス
class ScoreBase(models.Model):
    score_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    score = models.FloatField()
    not_play_yet = models.BooleanField(default=False)   # play済みか判定

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.score}"
    class Meta:
        abstract = True
    def save(self, *args, **kwargs):
        if not self.not_play_yet and self.pk is not None:
            # すでに作られてるオブジェクトが更新されるとき
            self.not_play_yet = True
        super().save(*args, **kwargs)
    
class NIKIRunScore(ScoreBase):
    # CHARACTERS = []
    # character = models.CharField(max_length=32,choices=CHARACTERS, default='normal')
    pass