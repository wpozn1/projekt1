const API_KEY = '8294e370833db44041f30ab168f6cc83'; // to trzeba wyjebać stąd
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let currentMovie = null;
let watchlist = [];
let drawCount = 0;
let movieSaved = false;
let isLoginMode = true;

function updateTime(val) {
    const el = document.getElementById('time-val');
    if (el) el.innerText = val;
}

function toggleSelect(el) {
    el.classList.toggle('selected');
}

function nextView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    const header = document.getElementById('main-header');
    if (header) {
        header.style.display = (viewId === 'view-start' || viewId === 'view-result') ? 'none' : 'block';
    }
}

async function fetchMovies() {

    if (drawCount >= MAX_DRAWS) {
        alert("Osiągnięto limit 5 losowań.");
        return;
    }

    const slider = document.getElementById('time-slider');
    const maxRuntime = slider ? slider.value : 110;
    const genreIds = Array.from(document.querySelectorAll('#genre-grid .selected'))
        .map(el => el.getAttribute('data-id')).join(',');

    const randomPage = Math.floor(Math.random() * 3) + 1;

    const filterParams = `&vote_average.gte=7.0&vote_count.gte=100&with_runtime.lte=${maxRuntime}&with_genres=${genreIds}`;

    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pl-PL&sort_by=popularity.desc&include_adult=false&page=${randomPage}${filterParams}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
            drawCount++;
            updateDrawButton();
            displayMovie(randomMovie);
        } else {
            if (randomPage > 1) {
                const retryUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pl-PL&sort_by=popularity.desc&include_adult=false&page=1${filterParams}`;
                const retryResponse = await fetch(retryUrl);
                const retryData = await retryResponse.json();

                if (retryData.results && retryData.results.length > 0) {
                    const randomMovie = retryData.results[0];
                    drawCount++;
                    updateDrawButton();
                    displayMovie(randomMovie);
                } else {
                    alert("Brak filmów z oceną 7.0+ dla tych kryteriów.");
                }
            } else {
                alert("Brak filmów z oceną 7.0+ dla tych kryteriów.");
            }
        }
    } catch (error) {
        console.error("Błąd API:", error);
    }
}

function updateDrawButton() {
    const btn = document.getElementById('btn-draw-again');
    const wybieramFilm = document.getElementById('wybieram-film');
    wybieramFilm.addEventListener('click', () => {
        movieSaved = true;
        updateDrawButton();
    });
    if (!btn) return;

    if (movieSaved) {
        btn.disabled = true;
        btn.innerText = "✅ Wybrałeś już swój film!";
        btn.style.opacity = "0.5";

        return;
    }

    const remaining = MAX_DRAWS - drawCount;
    btn.innerText = remaining > 0
        ? `🔄 Losuj ponownie (zostało: ${remaining})`
        : "🚫 Limit wyczerpany";

    if (remaining <= 0) {
        btn.style.opacity = "0.5";
        btn.disabled = true;
    }
}

function displayMovie(movie) {
    currentMovie = movie;
    document.getElementById('res-title').innerText = movie.title;
    document.getElementById('res-rating').innerText = `★ ${movie.vote_average.toFixed(1)}`;
    document.getElementById('res-desc').innerText = movie.overview || "Brak opisu w języku polskim.";
    document.getElementById('res-meta').innerText = `${movie.release_date ? movie.release_date.split('-')[0] : 'Brak daty'} • Film`;
    const poster = movie.poster_path ? (IMG_URL + movie.poster_path) : 'https://via.placeholder.com/500x750?text=Brak+Okładki';
    document.getElementById('res-img').style.backgroundImage = `url('${poster}')`;
    nextView('view-result');
}

async function saveMovie() {
    if (!currentMovie) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
        alert("Musisz się zalogować, aby zapisać film!");
        toggleModal();
        return;
    }

    if (watchlist.find(m => m.id === currentMovie.id)) {
        alert("Ten film jest już na Twojej liście!");
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/api/library/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id: currentMovie.id,
                title: currentMovie.title,
                runtime: currentMovie.runtime || 0,
                genres: currentMovie.genres || [],
                poster_path: currentMovie.poster_path,
                overview: currentMovie.overview,
            })
        });

        if (response.ok) {
            watchlist.push(currentMovie);
            updateWatchlistUI();
            alert(`Film "${currentMovie.title}" został zapisany na Twoim koncie!`);
        } else {
            const errorData = await response.json();
            alert("Błąd serwera: " + (errorData.detail || "Nie udało się zapisać filmu"));
        }
    } catch (error) {
        console.error("Błąd połączenia z API:", error);
        alert("Błąd sieci. Sprawdź, czy serwer Django działa.");
    }
}

function updateWatchlistUI() {
    console.log("Zawartość watchlisty przed rysowaniem:", watchlist);
    const listEl = document.getElementById('watchlist-items');
    const countEl = document.getElementById('watchlist-count');

    if (watchlist.length === 0) {
        listEl.innerHTML = '<p style="color: #666; font-size: 13px;">Lista jest pusta</p>';
        countEl.style.display = 'none';
    } else {
        listEl.innerHTML = watchlist.map(m => {
            const poster = m.poster_path ? (IMG_URL + m.poster_path) : 'https://via.placeholder.com/500x750?text=Brak+Okładki';
            return `
            <li>
                <div class="watchlist-movie-img" style="background-image: url('${poster}')"></div>
                <div style="font-weight: 600;">${m.title}</div>
            </li>
            `;
        }).join('');

        countEl.innerText = watchlist.length;
        countEl.style.display = watchlist.length > 0 ? 'flex' : 'none';
    }
}

function toggleWatchlist() {
    const modal = document.getElementById('watchlist-modal');
    modal.classList.toggle('active');
}
function createBackgroundIcons() {
    const bgContainer = document.getElementById('bg-animation');
    const icons = ['🎬', '🍿', '⭐', '🎭', '🎥', '🎞️', '💎', '🌟'];
    const numberOfIcons = 20;

    for (let i = 0; i < numberOfIcons; i++) {

        const item = document.createElement('div');
        item.className = 'bg-item';


        item.innerText = icons[Math.floor(Math.random() * icons.length)];


        const startPos = Math.random() * 100;
        const duration = 15 + Math.random() * 20;
        const delay = Math.random() * 20;
        const size = 25 + Math.random() * 40;
        const blurValue = Math.random() * 5 + 2;


        item.style.left = startPos + '%';
        item.style.fontSize = size + 'px';
        item.style.animationDuration = duration + 's';
        item.style.animationDelay = '-' + delay + 's';
        item.style.filter = `blur(${blurValue}px)`;
        item.style.opacity = Math.random() * 0.5 + 0.1;


        bgContainer.appendChild(item);
    }
}

function toggleModal(){
    const modal = document.getElementById('loginModal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex'
}

function switchMode(event) {
    event.preventDefault();
    isLoginMode = !isLoginMode;

    document.getElementById('modalTitle').innerText = isLoginMode ? 'Logowanie' : 'Rejestracja';
    document.getElementById('submitBtn').innerText = isLoginMode ? 'Zaloguj się' : 'Zarejestruj się';

    const switchLink = event.target;
    switchLink.innerText = isLoginMode ? 'Zarejestruj się' : 'Zaloguj się';
    switchLink.parentElement.firstChild.textContent = isLoginMode ? 'Nie masz konta? ' : 'Masz już konto? ';
}

async function handleAuth(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isLoginMode) {
        await loginUser(email, password);
    } else {
        await registerUser(email, password);
    }
}

async function loginUser(email, password) {
    const response = await fetch(`${API_URL}auth/jwt/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        alert('Zalogowano!');
        localStorage.setItem('accessToken', data.access);
        loadMyMovies();
        toggleModal();
        location.reload();
    } else {
        alert('Błąd logowania: ' + (data.detail || 'Sprawdź dane'));
    }
}

async function registerUser(email, password) {
    const response = await fetch(`${API_URL}auth/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: email,
            username: email.split('@')[0],
            password: password,
            re_password: password
        })
    });

    if (response.ok) {
        alert('Konto stworzone! Teraz możesz się zalogować.');
        isLoginMode = false;
        switchMode({ preventDefault: () => {} });
    } else {
        const data = await response.json();
        alert('Błąd rejestracji: ' + JSON.stringify(data));
    }
}

async function loadMyMovies() {
    const token = localStorage.getItem('accessToken');

    if (!token) return;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/library/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const moviesFromBackend = await response.json();

            watchlist = moviesFromBackend.map(movie => {
                return {
                    id: movie.external_id,
                    title: movie.title,
                    poster_path: movie.poster_path,
                    release_date: null,
                };
            });

            updateWatchlistUI();
            console.log("Library loaded from database");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadMyMovies();
});

window.addEventListener('DOMContentLoaded', createBackgroundIcons);