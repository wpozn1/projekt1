from django.urls import path, include
from .views import RandomMovieView, UserLibraryView

urlpatterns = [
    path('match/', RandomMovieView.as_view(), name='movie_match'),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    path('library/', UserLibraryView.as_view(), name='user-library')
]