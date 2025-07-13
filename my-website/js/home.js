const BASE_URL = 'https://tmdb-proxy.nardoski.workers.dev'; // ⬅️ Replace with your real Worker URL
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem;
let currentMoviePage = 1;
let currentTVPage = 1;
let currentAnimePage = 1;
let allEpisodes = [];
let currentEpisodePage = 1;
const episodesPerPage = 50;
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


function displayBanner(item) {
  currentItem = item;
  const banner = document.getElementById('banner');
  banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;

  document.getElementById('banner-title').textContent = item.title || item.name;
  document.getElementById('banner-overview').textContent = item.overview || '';
  updateIndicators();
}

function updateIndicators() {
  const indicators = document.getElementById('banner-indicators');
  indicators.innerHTML = '';

  bannerItems.forEach((_, index) => {
    const dot = document.createElement('span');
    dot.classList.add('dot');
    if (index === currentBannerIndex) dot.classList.add('active');
    dot.onclick = () => {
      currentBannerIndex = index;
      displayBanner(bannerItems[currentBannerIndex]);
      restartCarousel();
    };
    indicators.appendChild(dot);
  });
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
  let embedURL = "";

  if (server === "vidsrc.cc") {
    if (overrideSeason !== null && overrideEpisode !== null) {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}/${overrideSeason}/${overrideEpisode}`;
    } else {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
    }
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
    } else {
      if (overrideSeason !== null && overrideEpisode !== null) {
        embedURL = `https://vidsrc.xyz/embed/tv/${imdbID}/${overrideSeason}-${overrideEpisode}`;
      } else {
        embedURL = `https://vidsrc.xyz/embed/tv/${imdbID}`;
      }
    }

  } catch (e) {
    console.error("Failed to fetch IMDb ID:", e);
    document.getElementById('modal-video').src = "";
    return;
  }
} else if (server === "player.videasy.net") {
    embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
  }

  // ✅ Only set src if the URL is valid
  if (embedURL && embedURL.startsWith("https://")) {
    document.getElementById('modal-video').src = embedURL;
  } else {
    console.warn("Invalid embed URL:", embedURL);
    document.getElementById('modal-video').src = "";
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

    bannerItems = movies.slice(0, 10); // show top 10 only
    displayBanner(bannerItems[0]);
    startBannerCarousel();

    displayList(movies, 'movies-list');
    displayList(tvShows, 'tvshows-list');
    displayList(anime, 'anime-list');
  } finally {
    hideLoader();
  }
}

init();

let bannerItems = [];
let currentBannerIndex = 0;
let bannerInterval;

function rotateBanner() {
  if (!bannerItems.length) return;
  currentBannerIndex = (currentBannerIndex + 1) % bannerItems.length;
  displayBanner(bannerItems[currentBannerIndex]);
}

function prevBanner() {
  currentBannerIndex = (currentBannerIndex - 1 + bannerItems.length) % bannerItems.length;
  displayBanner(bannerItems[currentBannerIndex]);
  restartCarousel();
}

function nextBanner() {
  currentBannerIndex = (currentBannerIndex + 1) % bannerItems.length;
  displayBanner(bannerItems[currentBannerIndex]);
  restartCarousel();
}

function restartCarousel() {
  stopBannerCarousel();
  startBannerCarousel();
}

function startBannerCarousel() {
  bannerInterval = setInterval(rotateBanner, 7000); // every 7 seconds
}

function stopBannerCarousel() {
  clearInterval(bannerInterval);
}

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

async function playTrailer() {
  if (!currentItem) {
    alert("No content selected.");
    return;
  }

  const type = currentItem.media_type || (currentItem.first_air_date ? "tv" : "movie");

  try {
    const res = await fetch(`${BASE_URL}/?endpoint=/${type}/${currentItem.id}/videos`);
    const data = await res.json();
    const trailers = data.results.filter(
      vid => vid.type === "Trailer" && vid.site === "YouTube"
    );

    if (trailers.length > 0) {
      const trailerKey = trailers[0].key;
      window.open(`https://www.youtube.com/watch?v=${trailerKey}`, "_blank");
    } else {
      alert("Trailer not available.");
    }
  } catch (e) {
    console.error("Error fetching trailer:", e);
    alert("Error loading trailer.");
  }
}

document.getElementById('banner').addEventListener('mouseenter', stopBannerCarousel);
document.getElementById('banner').addEventListener('mouseleave', startBannerCarousel);
