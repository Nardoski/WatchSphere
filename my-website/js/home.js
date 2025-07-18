const BASE_URL = 'https://tmdb-proxy.nardoski.workers.dev'; // ⬅️ Replace with your real Worker URL
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem;
let allEpisodes = [];
let currentEpisodePage = 1;
let debounceTimer;
const currentPages = {
  movie: 1,
  tv: 1,
  anime: 1
};
const episodesPerPage = 50;
const maxMoviePages = 500;

function showLoader() {
  document.getElementById('loader').style.display = 'flex';
}
function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}

async function loadContent({ 
  endpoint, 
  containerId, 
  pageIndicatorId, 
  prevBtnId, 
  nextBtnId, 
  page, 
  mediaType, 
  modalIdToClose 
}) {
  showLoader();
  try {
    const container = document.getElementById(containerId);
    const pageIndicator = document.getElementById(pageIndicatorId);
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);

    container.innerHTML = '';

    const res = await fetch(`${BASE_URL}/?endpoint=${endpoint}&page=${page}`);
    const data = await res.json();

    data.results.forEach(item => {
      if (!item.poster_path) return;
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = `${IMG_URL}${item.poster_path}`;
      img.alt = item.title || item.name;
      img.onclick = () => {
        document.getElementById(modalIdToClose).style.display = 'none';
        item.media_type = mediaType;
        showDetails(item);
      };
      container.appendChild(img);
    });

    pageIndicator.textContent = `Page ${page}`;
    prevBtn.disabled = (page === 1);
    nextBtn.disabled = (page === maxMoviePages);
  } finally {
    hideLoader();
  }
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

function displayBanner(item) {
  const banner = document.getElementById('banner');
  const overlay = document.getElementById('banner-overlay');
  const player = document.getElementById('banner-player');
  const iframe = document.getElementById('banner-video');

  document.getElementById('banner').style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  document.getElementById('banner-title').textContent = item.title || item.name;
  const desc = item.overview || "Watch trending movies and shows on WatchSphere!";
  const bannerDesc = document.getElementById('banner-description');
  if (bannerDesc) bannerDesc.textContent = desc.length > 200 ? desc.slice(0, 200) + '...' : desc;

  currentItem = item;

  // "Play" expands the banner
  document.getElementById('play-btn').onclick = () => {
    overlay.style.display = "none";
    player.style.display = "block";

    const type = item.media_type === "movie" ? "movie" : "tv";
    const server = document.getElementById('server')?.value || "vidsrc.cc";

    let embedURL = `https://vidsrc.cc/v2/embed/${type}/${item.id}`;
    if (server === "player.videasy.net") {
      embedURL = `https://player.videasy.net/${type}/${item.id}`;
    }

    iframe.src = embedURL;
  };

  // "More Info" still opens the full details modal
  document.getElementById('info-btn').onclick = () => showDetails(item);
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function renderEpisodesPage() {
  const list = document.getElementById('episodes-list');
  const pageIndicator = document.getElementById('episode-page-indicator');
  const prevBtn = document.getElementById('prevEpisodePageBtn');
  const nextBtn = document.getElementById('nextEpisodePageBtn');

  list.innerHTML = '';
  const start = (currentEpisodePage - 1) * episodesPerPage;
  const end = start + episodesPerPage;
  const pageEpisodes = allEpisodes.slice(start, end);

  pageEpisodes.forEach(ep => {
    const li = document.createElement('li');
    li.textContent = `S${ep.season_number} E${ep.episode_number}: ${ep.name}`;
    li.style.cursor = 'pointer';
    li.style.color = '#00aced';
    li.style.marginBottom = '8px';
    li.onclick = () => {
      changeServer(ep.season_number, ep.episode_number);
    };
    list.appendChild(li);
  });

  pageIndicator.textContent = `Page ${currentEpisodePage}`;
  prevBtn.disabled = currentEpisodePage === 1;
  nextBtn.disabled = end >= allEpisodes.length;
}

function changeEpisodePage(delta) {
  currentEpisodePage += delta;
  renderEpisodesPage();
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

    if (isAnime) {
      const tvInfoRes = await fetch(`${BASE_URL}/?endpoint=/tv/${item.id}`);
      const tvInfo = await tvInfoRes.json();

      allEpisodes = [];
      for (let season = 1; season <= tvInfo.number_of_seasons; season++) {
        const seasonRes = await fetch(`${BASE_URL}/?endpoint=/tv/${item.id}/season/${season}`);
        const seasonData = await seasonRes.json();
        if (seasonData.episodes) {
          allEpisodes = allEpisodes.concat(
            seasonData.episodes.map(ep => ({
              ...ep,
              season_number: season
            }))
          );
        }
      }

      currentEpisodePage = 1;
      renderEpisodesPage();
      episodesContainer.style.display = 'block';
    } else {
      episodesContainer.style.display = 'none';
    }
  } finally {
    hideLoader();
  }
}

async function changeServer(overrideSeason = null, overrideEpisode = null) {
  const server = document.getElementById('server').value;
  const type = currentItem.media_type === "movie" ? "movie" : "tv";
  const episodesContainer = document.getElementById('episodes-container');
  let embedURL = "";

  // 🔒 Hide episode list if server is Videasy
  if (server === "player.videasy.net") {
    episodesContainer.style.display = 'none';
  } else if (
    currentItem.media_type === "tv" ||
    currentItem.original_language === "ja"
  ) {
    episodesContainer.style.display = 'block';
  }

  // 📺 Vidsrc.cc
  if (server === "vidsrc.cc") {
    if (overrideSeason !== null && overrideEpisode !== null) {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}/${overrideSeason}/${overrideEpisode}`;
    } else {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
    }

  // 📺 Vidsrc.xyz
  } else if (server === "vidsrc.xyz") {
    try {
      const res = await fetch(`${BASE_URL}/?endpoint=/${type}/${currentItem.id}/external_ids`);
      const data = await res.json();
      const imdbID = data.imdb_id;

      if (!imdbID) {
        console.error("IMDb ID not found.");
        document.getElementById('modal-video').src = "";
        return;
      }

      if (type === "movie") {
        embedURL = `https://vidsrc.xyz/embed/movie/${imdbID}`;
      } else if (overrideSeason !== null && overrideEpisode !== null) {
        embedURL = `https://vidsrc.xyz/embed/tv/${imdbID}/${overrideSeason}-${overrideEpisode}`;
      } else {
        embedURL = `https://vidsrc.xyz/embed/tv/${imdbID}`;
      }

    } catch (e) {
      console.error("Failed to fetch IMDb ID:", e);
      document.getElementById('modal-video').src = "";
      return;
    }

  // 📺 Videasy (no episode support)
  } else if (server === "player.videasy.net") {
    embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
  }

  // ✅ Safely update iframe src
  const iframe = document.getElementById('modal-video');
  if (embedURL && embedURL.startsWith("https://")) {
    iframe.src = embedURL;
  } else {
    console.warn("Invalid embed URL:", embedURL);
    iframe.src = "";
  }
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
      img.loading = 'lazy';
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

function openListModal(type) {
  document.getElementById(`${type}-list-modal`).style.display = 'flex';
  currentPages[type] = 1;

  if (type === 'movie') {
    loadAllMovies(currentPages.movie);
  } else if (type === 'tv') {
    loadAllTVShows(currentPages.tv);
  } else if (type === 'anime') {
    loadAllAnime(currentPages.anime);
  }
}

function closeListModal(type) {
  document.getElementById(`${type}-list-modal`).style.display = 'none';
}

function loadAllMovies(page) {
  loadContent({
    endpoint: '/movie/popular',
    containerId: 'all-movies-list',
    pageIndicatorId: 'movie-page-indicator',
    prevBtnId: 'prevPageBtn',
    nextBtnId: 'nextPageBtn',
    page,
    mediaType: 'movie',
    modalIdToClose: 'movie-list-modal'
  });
}

function changePage(type, delta) {
  // Adjust page
  currentPages[type] += delta;

  // Clamp the value between 1 and maxMoviePages
  currentPages[type] = Math.max(1, Math.min(currentPages[type], maxMoviePages));

  // Call the right loader
  if (type === 'movie') {
    loadAllMovies(currentPages.movie);
  } else if (type === 'tv') {
    loadAllTVShows(currentPages.tv);
  } else if (type === 'anime') {
    loadAllAnime(currentPages.anime);
  }
}

function loadAllTVShows(page) {
  loadContent({
    endpoint: '/tv/popular',
    containerId: 'all-tv-list',
    pageIndicatorId: 'tv-page-indicator',
    prevBtnId: 'prevTVPageBtn',
    nextBtnId: 'nextTVPageBtn',
    page,
    mediaType: 'tv',
    modalIdToClose: 'tv-list-modal'
  });
}

function loadAllAnime(page) {
  loadContent({
    endpoint: '/discover/tv&language=en-US&with_original_language=ja&with_genres=16&sort_by=popularity.desc',
    containerId: 'all-anime-list',
    pageIndicatorId: 'anime-page-indicator',
    prevBtnId: 'prevAnimePageBtn',
    nextBtnId: 'nextAnimePageBtn',
    page,
    mediaType: 'tv',
    modalIdToClose: 'anime-list-modal'
  });
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

function handleSearchInput() {
  debounce(() => searchTMDB(), 300);
}

function debounce(callback, delay = 300) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(callback, delay);
}

document.getElementById('close-player').onclick = () => {
  document.getElementById('banner-player').style.display = 'none';
  document.getElementById('banner-video').src = '';
  document.getElementById('banner-overlay').style.display = 'flex';
};
