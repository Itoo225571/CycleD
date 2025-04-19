from django.urls import path,include
from . import views

app_name="games"

urlpatterns = [
    path('/',views.TopView.as_view(),name="top"),
    path('/run/',views.RunGameView.as_view(),name='run'),
    path('/roulette/',views.RouletteView.as_view(),name='roulette'),
]