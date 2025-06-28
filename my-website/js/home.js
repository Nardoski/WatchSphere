let timeout = null;

function debounceSearch() {
  clearTimeout(timeout);
  timeout = setTimeout(performSearch, 500);  // Delay to allow user typing
}

async function performSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) {
    document.getElementById('search-results').innerHTML = '';  // Clear results if input is empty
    return;
  }

  const API_KEY = '913219c9e9d90cf47023e3599324e1f2';
  const BASE_URL = 'https://api.themoviedb.org/3';
  const IMG_URL = 'https://image.tmdb.org/t/p/original';
  
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
  const data = await res.json();

  const container = document.getElementById('search-results');
  container.innerHTML = '';  // Clear previous results

  if (data.results.length > 0) {
    data.results.forEach(item => {
      if (item.poster_path) {
        const img = document.createElement('img');
        img.src = `${IMG_URL}${item.poster_path}`;
        img.alt = item.title || item.name;
        img.onclick = () => {
          closeSearchModal();
          showDetails(item);
        };
        container.appendChild(img);
      }
    });
  } else {
    container.innerHTML = 'No results found.';
  }
}

function closeSearchModal() {
  document.getElementById('search-results-container').style.display = 'none';
}

function showDetails(item) {
  const API_KEY = '913219c9e9d90cf47023e3599324e1f2';
  const IMG_URL = 'https://image.tmdb.org/t/p/original';

  currentItem = item;
  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview;
  document.getElementById('modal-image').src = `${IMG_URL}${item.poster_path}`;
  document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average / 2));
  changeServer();
  document.getElementById('modal').style.display = 'flex';
}

async function init() {
  const movies = await fetchTrending('movie');
  const tvShows = await fetchTrending('tv');
  const anime = await fetchTrendingAnime();

  displayBanner(movies[Math.floor(Math.random() * movies.length)]);
  displayList(movies, 'movies-list');
  displayList(tvShows, 'tvshows-list');
  displayList(anime, 'anime-list');
}

init();
