const BASE_URL = 'https://tmdb-proxy.nardoski.workers.dev'; // ⬅️ Replace with your real Worker URL
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem;
let currentMoviePage = 1;
let currentTVPage = 1;
let currentAnimePage = 1;
const maxMoviePages = 500;

function showLoader() {
  document.getElementById('loader').style.display = 'flex';
}
function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}

async function fetchTrending(type) {
  const res = await fetch(`${BASE_URL}/?endpoint=/trending/${type}/week`);
  const data = await res.json();
  return data.results;
}

async function fetchTrendingAnime() {
  let allResults = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`${BASE_URL}/?endpoint=/trending/tv/week&page=${page}`);
    const data = await res.json();
    const filtered = data.results.filter(item =>
      item.original_language === 'ja' && item.genre_ids.includes(16)
    );
    allResults = allResults.concat(filtered);
  }
  return allResults;
}

async function fetchEpisodes(tvId) {
  const seasonRes = await fetch(`${BASE_URL}/?endpoint=/tv/${tvId}`);
  const seasonData = await seasonRes.json();
  const lastSeason = seasonData.number_of_seasons;

  const episodeRes = await fetch(`${BASE_URL}/?endpoint=/tv/${tvId}/season/${lastSeason}`);
  const episodeData = await episodeRes.json();
  return episodeData.episodes || [];
}

function displayBanner(item) {
  document.getElementById('banner').style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById('banner-title').textContent = item.title || item.name;
  document.getElementById('banner-description').textContent = item.overview || '';
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

async function showDetails(item) {
  showLoader();
  try {
    currentItem = item;
    document.getElementById('modal-title').textContent = item.title || item.name;
    document.getElementById('modal-description').textContent = item.overview;
    document.getElementById('modal-image').src = `${IMG_URL}${item.poster_path}`;
    document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average / 2));
    changeServer();
    document.getElementById('modal').style.display = 'flex';

    const isAnime = item.media_type === "tv" || item.original_language === "ja";
    const episodesContainer = document.getElementById('episodes-container');
    const episodesList = document.getElementById('episodes-list');
    if (isAnime) {
      const episodes = await fetchEpisodes(item.id);
      episodesList.innerHTML = '';
      episodes.forEach(ep => {
        const li = document.createElement('li');
        li.textContent = `Episode ${ep.episode_number}: ${ep.name}`;
        li.style.cursor = 'pointer';
        li.style.color = '#00aced';
        li.style.marginBottom = '8px';
        li.onclick = () => {
          changeServer(ep.season_number, ep.episode_number);
        };
        episodesList.appendChild(li);
      });
      episodesContainer.style.display = 'block';
    } else {
      episodesContainer.style.display = 'none';
    }
  } finally {
    hideLoader();
  }
}

function changeServer(overrideSeason = null, overrideEpisode = null) {
  const server = document.getElementById('server').value;
  const type = currentItem.media_type === "movie" ? "movie" : "tv";
  let embedURL = "";

  if (server === "vidsrc.cc") {
    if (overrideSeason !== null && overrideEpisode !== null) {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}/${overrideSeason}/${overrideEpisode}`;
    } else {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
    }
  } else if (server === "vidsrc.me") {
    embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
  } else if (server === "player.videasy.net") {
    embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
  }

  document.getElementById('modal-video').src = embedURL;
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal-video').src = '';
  document.getElementById('episodes-list').innerHTML = '';
}

function openSearchModal() {
  document.getElementById('search-modal').style.display = 'flex';
  document.getElementById('search-input').focus();
}

function closeSearchModal() {
  document.getElementById('search-modal').style.display = 'none';
  document.getElementById('search-results').innerHTML = '';
}

async function searchTMDB() {
  const query = document.getElementById('search-input').value;
  if (!query.trim()) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }

  showLoader();
  try {
    const res = await fetch(`${BASE_URL}/?endpoint=/search/multi&query=${encodeURIComponent(query)}`);
    const data = await res.json();

    const container = document.getElementById('search-results');
    container.innerHTML = '';
    data.results.forEach(item => {
      if (!item.poster_path) return;
      const img = document.createElement('img');
      img.src = `${IMG_URL}${item.poster_path}`;
      img.alt = item.title || item.name;
      img.onclick = () => {
        closeSearchModal();
        showDetails(item);
      };
      container.appendChild(img);
    });
  } finally {
    hideLoader();
  }
}

async function init() {
  showLoader();
  try {
    const movies = await fetchTrending('movie');
    const tvShows = await fetchTrending('tv');
    const anime = await fetchTrendingAnime();

    displayBanner(movies[Math.floor(Math.random() * movies.length)]);
    displayList(movies, 'movies-list');
    displayList(tvShows, 'tvshows-list');
    displayList(anime, 'anime-list');
  } finally {
    hideLoader();
  }
}

init();

function openMovieListModal() {
  document.getElementById('movie-list-modal').style.display = 'flex';
  currentMoviePage = 1;
  loadAllMovies(currentMoviePage);
}

function closeMovieListModal() {
  document.getElementById('movie-list-modal').style.display = 'none';
}

async function loadAllMovies(page = 1) {
  showLoader();
  try {
    const container = document.getElementById('all-movies-list');
    container.innerHTML = '';

    const res = await fetch(`${BASE_URL}/?endpoint=/movie/popular&page=${page}`);
    const data = await res.json();

    data.results.forEach(movie => {
      if (!movie.poster_path) return;
      const img = document.createElement('img');
      img.src = `${IMG_URL}${movie.poster_path}`;
      img.alt = movie.title || movie.name;
      img.onclick = () => {
        closeMovieListModal();
        movie.media_type = "movie";
        showDetails(movie);
      };
      container.appendChild(img);
    });

    document.getElementById('movie-page-indicator').textContent = `Page ${page}`;
    document.getElementById('prevPageBtn').disabled = (page === 1);
    document.getElementById('nextPageBtn').disabled = (page === maxMoviePages);
  } finally {
    hideLoader();
  }
}

function changeMoviePage(delta) {
  currentMoviePage += delta;
  if (currentMoviePage < 1) currentMoviePage = 1;
  if (currentMoviePage > maxMoviePages) currentMoviePage = maxMoviePages;
  loadAllMovies(currentMoviePage);
}

function openTVListModal() {
  document.getElementById('tv-list-modal').style.display = 'flex';
  currentTVPage = 1;
  loadAllTVShows(currentTVPage);
}

function closeTVListModal() {
  document.getElementById('tv-list-modal').style.display = 'none';
}

async function loadAllTVShows(page = 1) {
  showLoader();
  try {
    const container = document.getElementById('all-tv-list');
    container.innerHTML = '';

    const res = await fetch(`${BASE_URL}/?endpoint=/tv/popular&page=${page}`);
    const data = await res.json();

    data.results.forEach(tv => {
      if (!tv.poster_path) return;
      const img = document.createElement('img');
      img.src = `${IMG_URL}${tv.poster_path}`;
      img.alt = tv.name || tv.title;
      img.onclick = () => {
        closeTVListModal();
        tv.media_type = "tv";
        showDetails(tv);
      };
      container.appendChild(img);
    });

    document.getElementById('tv-page-indicator').textContent = `Page ${page}`;
    document.getElementById('prevTVPageBtn').disabled = (page === 1);
    document.getElementById('nextTVPageBtn').disabled = (page === maxMoviePages);
  } finally {
    hideLoader();
  }
}

function changeTVPage(delta) {
  currentTVPage += delta;
  if (currentTVPage < 1) currentTVPage = 1;
  if (currentTVPage > maxMoviePages) currentTVPage = maxMoviePages;
  loadAllTVShows(currentTVPage);
}

function openAnimeListModal() {
  document.getElementById('anime-list-modal').style.display = 'flex';
  currentAnimePage = 1;
  loadAllAnime(currentAnimePage);
}

function closeAnimeListModal() {
  document.getElementById('anime-list-modal').style.display = 'none';
}

function changeAnimePage(delta) {
  currentAnimePage += delta;
  if (currentAnimePage < 1) currentAnimePage = 1;
  if (currentAnimePage > maxMoviePages) currentAnimePage = maxMoviePages;
  loadAllAnime(currentAnimePage);
}

async function loadAllAnime(page = 1) {
  showLoader();
  try {
    const container = document.getElementById('all-anime-list');
    container.innerHTML = '';

    const res = await fetch(`${BASE_URL}/?endpoint=/discover/tv&language=en-US&page=${page}&with_original_language=ja&with_genres=16&sort_by=popularity.desc`);
    const data = await res.json();

    data.results.forEach(anime => {
      if (!anime.poster_path) return;
      const img = document.createElement('img');
      img.src = `${IMG_URL}${anime.poster_path}`;
      img.alt = anime.name || anime.title;
      img.onclick = () => {
        closeAnimeListModal();
        anime.media_type = "tv";
        showDetails(anime);
      };
      container.appendChild(img);
    });

    document.getElementById('anime-page-indicator').textContent = `Page ${page}`;
    document.getElementById('prevAnimePageBtn').disabled = (page === 1);
    document.getElementById('nextAnimePageBtn').disabled = (page === maxMoviePages);
  } finally {
    hideLoader();
  }
}

function toggleMenu() {
  const menu = document.getElementById('hamburger-menu');
  menu.style.display = (menu.style.display === 'flex') ? 'none' : 'flex';
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('hamburger-menu');
  const hamburger = document.querySelector('.hamburger');
  if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
    menu.style.display = 'none';
  }
});
