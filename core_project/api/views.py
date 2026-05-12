import random
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from .serializers import MovieSerializer
from .models import Movie

class RandomMovieView(APIView):
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def post(self, request):
        genre_id=request.data.get('genre', '')
        provider_id=request.data.get('platform', '')
        max_length=request.data.get('max_length', 110)

        tmdb_url = "https://api.themoviedb.org/3/discover/movie"

        params = {
            'api_key': settings.TMDB_API_KEY,
            'language': 'en-US',
            'watch_region': 'US',
            'sort_by': 'popularity.desc',
            'vote_average.gte': 7.0,
            'vote_count.gte': 100,
        }

        if genre_id:
            params['with_genres'] = str(genre_id).replace(',','|')
        if provider_id:
            params['with_watch_providers'] = str(provider_id).replace(',', '|')
        if max_length:
            params['with_runtime.lte'] = max_length

        try:
            params['page'] = 1
            initial_response = requests.get(tmdb_url, params=params)
            initial_response.raise_for_status()
            data = initial_response.json()

            total_pages = data.get('total_pages', 0)

            if total_pages == 0:
                return Response(status=status.HTTP_404_NOT_FOUND)

            max_page = min(total_pages, 30)
            random_page = random.randint(1, max_page)

            if random_page > 1:
                params['page'] = random_page
                response = requests.get(tmdb_url, params=params)
                response.raise_for_status()
                data = response.json()

            movies = data.get('results', [])

            if not movies:
                return Response(status=status.HTTP_404_NOT_FOUND)

            random_movie = random.choice(movies)

            return Response({
                "id": random_movie.get('id'),
                "title": random_movie.get('title'),
                "overview": random_movie.get('overview'),
                "release_date": random_movie.get('release_date'),
                "vote_average": random_movie.get('vote_average'),
                "poster_path": random_movie.get('poster_path'),
                "genre_ids": random_movie.get('genre_ids', []),
            }, status=status.HTTP_200_OK)

        except requests.RequestException:
            return Response(status=status.HTTP_502_BAD_GATEWAY)

class UserLibraryView(generics.ListCreateAPIView):
    serializer_class = MovieSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return self.request.user.watched_movies.all()

    def perform_create(self, serializer):
        data = serializer.validated_data

        movie, created = Movie.objects.get_or_create(
            external_id=data.get('external_id'),
            defaults={
                'title': data.get('title'),
                'length': data.get('length') or 0,
                'genre': data.get('genre') or "Unknown",
                'poster_path': data.get('poster_path', ''),
                'overview': data.get('overview', ''),
            }
        )

        self.request.user.watched_movies.add(movie)


