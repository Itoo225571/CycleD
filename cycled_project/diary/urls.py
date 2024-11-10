from django.urls import path
from . import views

app_name="diary"

urlpatterns = [
    path("",views.TopView.as_view(),name="top"),
    path("home/",views.HomeView.as_view(),name="home"),
    
    path("signin/",views.SigninView.as_view(),name="signin"),
    path("signup/",views.SignupView.as_view(),name="signup"),
    path("signout/",views.SignoutView.as_view(),name="signout"),
    
    path("user/",views.UserProfileView.as_view(),name="user_profile"),
    path("user/edit/",views.UserEditView.as_view(),name="user_edit"),
    
    # path("diary/",views.DiaryNewView.as_view(),name="diary"),
    path("diary/<uuid:pk>/edit",views.DiaryEditView.as_view(),name="diary_edit"),
    path("diary/<uuid:pk>/delete",views.DiaryDeleteView.as_view(),name="diary_delete"),    
    path("diary/photo/",views.DiaryPhotoView.as_view(),name="diary_photo"),

    path("weather/",views.WeatherView.as_view(),name="weather_report"),
    path("location2weather/",views.ajax_location2weather,name="ajax_location2weather"), 

    path("address/",views.AddressUserView.as_view(),name= "address_user"),
    
    path("calendar/",views.CalendarView.as_view(),name="calendar"),   
    path("calendar_edit/",views.DiaryNewView.as_view(),name="calendar_edit"),   

    path("diary/sendDiaries",views.sendDairies,name="sendDiaries"),
    # path("diary/photos2Locations",views.photos2Locations,name="photos2Locations"),
    path("diary/photos2Locations",views.Photos2LocationsView.as_view(),name="photos2Locations"),
    path('diary/delete-all-diaries/', views.delete_all_diaries, name='delete_all_diaries'),
]

