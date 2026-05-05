const API_KEY = '8294e370833db44041f30ab168f6cc83'; // to trzeba wyjebać stąd
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let currentMovie = null;
let watchlist = [];
let drawCount = 0;
const MAX_DRAWS = 3;
let movieSaved = false;
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
        alert("Osiągnięto limit 3 losowań.");
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

function saveMovie() {

    if (!currentMovie) return;
    if (watchlist.find(m => m.id === currentMovie.id)) {
        alert("Ten film jest już na Twojej liście!");
        return;
    }



    watchlist.push(currentMovie);
    updateWatchlistUI();


}

function updateWatchlistUI() {
    const listEl = document.getElementById('watchlist-items');
    const countEl = document.getElementById('watchlist-count');

    if (watchlist.length === 0) {
        listEl.innerHTML = '<p style="color: #666; font-size: 13px;">Lista jest pusta</p>';
        countEl.style.display = 'none';
    } else {
        listEl.innerHTML = watchlist.map(m => `
            <li>
                <div style="font-weight: 600;">${m.title}</div>
                <div style="font-size: 11px; color: var(--text-dim);">${m.release_date ? m.release_date.split('-')[0] : 'N/A'}</div>
            </li>
        `).join('');

        countEl.innerText = watchlist.length;
        countEl.style.display = watchlist.length > 0 ? 'flex' : 'none';
    }
}

function toggleWatchlist() {
    const modal = document.getElementById('watchlist-modal');
    modal.classList.toggle('active');
} function createBackgroundIcons() {
    const bgContainer = document.getElementById('bg-animation');
    const items = bgContainer.getElementsByClassName('bg-item');

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

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
    }
}

window.addEventListener('DOMContentLoaded', createBackgroundIcons);