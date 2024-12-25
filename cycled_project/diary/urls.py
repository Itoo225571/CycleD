from django.urls import path
from . import views

app_name="diary"

urlpatterns = [
    path("",views.TopView.as_view(),name="top"),
    path("home/",views.HomeView.as_view(),name="home"),
    
    path("user/",views.UserProfileView.as_view(),name="user_profile"),
    path("user/edit/",views.UserEditView.as_view(),name="user_edit"),
    
    # path("diary/",views.DiaryNewView.as_view(),name="diary"),
    path("diary/photo/",views.DiaryPhotoView.as_view(),name="diary_photo"),

    path("weather/",views.WeatherView.as_view(),name="weather_report"),
    path("location2weather/",views.ajax_location2weather,name="ajax_location2weather"), 

    path("address/",views.AddressUserView.as_view(),name= "address_user"),
    
    path("calendar/",views.CalendarView.as_view(),name="calendar"),
    # path("calendar_edit/",views.DiaryNewView.as_view(),name="calendar_edit"),   

    path("diary/sendDiaries",views.sendDairies,name="sendDiaries"),
    # path("diary/photos2Locations",views.photos2Locations,name="photos2Locations"),
    path("diary/photos2Locations",views.Photos2LocationsView.as_view(),name="photos2Locations"),
    path('diary/delete-all-diaries/', views.delete_all_diaries, name='delete_all_diaries'),

    path('diary/edit-diary-noPK/', views.diary_edit_noPK, name='editDiary_noPK'),
    path('diary/delete-diary-noPK/', views.diary_delete_noPK, name='deleteDiary_noPK'),
    path('diary/delete-diary/<uuid:pk>', views.DiaryDeleteView.as_view(), name='deleteDiary'),
]

