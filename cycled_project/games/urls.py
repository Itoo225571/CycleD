from django.urls import path,include
from . import views

from rest_framework.routers import DefaultRouter

app_name="games"

router = DefaultRouter()
router.register(r'score_nikirun', views.NIKIRunScoreViewSet, basename='score_nikirun')

urlpatterns = [
    path('',views.TopView.as_view(),name="top"),
    path('run/',views.RunGameView.as_view(),name='run'),
    path('roulette/',views.RouletteView.as_view(),name='roulette'),

    path('api/', include(router.urls)),
]