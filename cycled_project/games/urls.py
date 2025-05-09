from django.urls import path,include
from . import views

from rest_framework.routers import DefaultRouter

app_name="games"

router = DefaultRouter()
router.register(r'nikirun_score', views.NIKIRunScoreViewSet, basename='nikirun_score')

urlpatterns = [
    path('',views.TopView.as_view(),name="top"),

    path('run/',views.NIKIRunScoreView.as_view(),name='run'),
    path('run/get_data/',views.NIKIRunDataAPIView.as_view(),name='run_data'),

    path('roulette/',views.RouletteView.as_view(),name='roulette'),

    path('api/', include(router.urls)),
]