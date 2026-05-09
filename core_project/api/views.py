import random
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
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
            'language': 'en-EN',
            'watch_region': 'EN',
            'with_genres': genre_id,
            'with_watch_providers': provider_id,
            'with_runtime.lte': max_length,
            'sort_by': 'popularity.desc',
            'page': random.randint(1, 5),
            'vote_average.gte': 7.0,
            'vote_count.gte': 100,
        }

        if genre_id:
            params['with_genres'] = genre_id
        if provider_id:
            params['with_watch_providers'] = provider_id
        if max_length:
            params['with_runtime.lte'] = max_length

        try:
            response = requests.get(tmdb_url, params=params)
            response.raise_for_status()
            data = response.json()

            movies = data.get('results', [])

            if not movies:
                return Response(
                    status=status.HTTP_404_NOT_FOUND
                )

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
            return Response(
                status=status.HTTP_502_BAD_GATEWAY
            )

class UserLibraryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        movies = user.watched_movies.all()
        serializer = MovieSerializer(movies, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        data = request.data
        
        genre_ids = data.get('genres', [])
        genre_str = str(genre_ids[0]) if genre_ids else "Unknown"

        movie, created = Movie.objects.get_or_create(
            external_id=data.get('id'),
            defaults={
                'title': data.get('title'),
                'length': data.get('runtime') or 0,
                'genre': genre_str,
                'poster_path': data.get('poster_path'),
                'overview': data.get('overview'),
            }
        )
        
        request.user.watched_movies.add(movie)

        return Response({
            "message": "Film dodany!",
            "added_new_to_db": created
        }, status=201)

