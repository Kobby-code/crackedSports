/* ---------------- Dark / Light Mode Toggle ---------------- */
const toggleModeBtn = document.getElementById('toggleMode');
if (toggleModeBtn) {
  toggleModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    toggleModeBtn.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
  });
}

/* ---------------- Utility Functions ---------------- */
const apiBase = 'https://streamed.pk/api/matches';
const REFRESH_INTERVAL = 30000; // 30s
let currentMatchId = null; // will track the currently-playing match on watch page

function normalizeResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.matches)) return data.matches;
  for (const k of Object.keys(data)) if (Array.isArray(data[k])) return data[k];
  return [];
}

function esc(s) { return String(s || '').replace(/'/g, "\\'").replace(/"/g, '\"'); }

/* ---------------- Robust Image Helper ---------------- */
function getMatchImage(match) {
  const fallback = 'assets/images/logo.png';
  const alt = (match && (match.title || match.name)) ? (match.title || match.name) : 'Match Image';

  function isFullUrl(s) { try { return !!(s && (s.startsWith('http://') || s.startsWith('https://'))); } catch (e) { return false; } }
  function hasExtension(s) { return !!(s && /\.(png|jpe?g|gif|webp|svg)$/i.test(s)); }
  function buildProxyPoster(tokenOrPath) {
    if (!tokenOrPath) return null;
    const normalized = String(tokenOrPath).replace(/^\/+/, '');
    return isFullUrl(normalized) ? normalized : `https://streamed.pk/api/images/proxy/${normalized}${hasExtension(normalized) ? '' : '.webp'}`;
  }
  function buildBadgeUrl(badge) {
    if (!badge) return null;
    const b = String(badge).replace(/^\/+/, '');
    return isFullUrl(b) ? b : `https://streamed.pk/api/images/badge/${b}${hasExtension(b) ? '' : '.webp'}`;
  }

  const homeBadge = match?.teams?.home?.badge;
  const awayBadge = match?.teams?.away?.badge;

  if (homeBadge && awayBadge) return { src: `https://streamed.pk/api/images/poster/${homeBadge.replace(/^\/+/, '')}/${awayBadge.replace(/^\/+/, '')}.webp`, alt, isExternal: true };
  if (match?.poster) return { src: buildProxyPoster(match.poster), alt, isExternal: true };
  if (homeBadge) return { src: buildBadgeUrl(homeBadge), alt, isExternal: true };
  if (awayBadge) return { src: buildBadgeUrl(awayBadge), alt, isExternal: true };
  return { src: fallback, alt, isExternal: false };
}

/* ---------------- Countdown Modal ---------------- */
function showCountdownModal(title, matchTime, thumb, altText) {
  const modalTitle = document.getElementById('modalMatchTitle');
  const timerEl = document.getElementById('countdownTimer');
  const modalThumb = document.getElementById('modalMatchThumbnail');
  modalTitle.textContent = title;
  modalThumb.src = thumb || 'assets/images/logo.png';
  modalThumb.alt = altText || 'Match Thumbnail';

  const modal = new bootstrap.Modal(document.getElementById('countdownModal'));
  modal.show();

  clearInterval(window.countdownInterval);

  function updateTimer() {
    const now = Date.now();
    const diff = (matchTime || 0) - now;
    if (diff <= 0) {
      timerEl.textContent = 'Match Started!';
      clearInterval(window.countdownInterval);
      return;
    }
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timerEl.textContent = `Match starts in: ${hours}h ${minutes}m ${seconds}s`;
  }

  updateTimer();
  window.countdownInterval = setInterval(updateTimer, 1000);
  document.getElementById('countdownModal').addEventListener('hidden.bs.modal', () => clearInterval(window.countdownInterval));
}

/* ---------------- Render Functions ---------------- */
function renderMatches(containerId, matches, options = {}) {
  const { treatPopularLikeUpcoming = false, liveIdSet = new Set() } = options;
  const container = document.getElementById(containerId);
  if (!container) return;

  matches = (matches || []).filter(m => (m.category || '').toLowerCase() === 'football');
  if (!matches.length) {
    container.innerHTML = '<div class="empty-state">No football matches available.</div>';
    return;
  }

  const html = matches.map(match => {
    const title = match.title || match.name || 'Untitled Match';
    const category = match.category || 'Sports';
    const imgInfo = getMatchImage(match);
    const thumbSrc = imgInfo.src;
    const altText = esc(imgInfo.alt);
    const id = match.id || (match.sources && match.sources[0] && match.sources[0].id) || '';
    const isLive = !!(match.isLive || (match.status && String(match.status).toLowerCase() === 'live') || liveIdSet.has(match.id));

    if (treatPopularLikeUpcoming) {
      if (isLive) {
        return `<div class='match-card' onclick="${id ? `window.location.href='watch.html?id=${id}'` : ''}"><div class='live-badge'>LIVE</div><img src='${thumbSrc}' alt='${altText}' loading='lazy' onerror="this.onerror=null;this.src='assets/images/logo.png'" /><h6 class='mt-2'>${esc(title)}</h6><small>${esc(category)}</small></div>`;
      } else {
        return `<div class='match-card' onclick="showCountdownModal('${esc(title)}', ${match.date || 0}, '${esc(thumbSrc)}', '${altText}')"><img src='${thumbSrc}' alt='${altText}' loading='lazy' onerror="this.onerror=null;this.src='assets/images/logo.png'" /><h6 class='mt-2'>${esc(title)}</h6><small>${esc(category)}</small></div>`;
      }
    }

    if (isLive) {
      return `<div class='match-card' onclick="${id ? `window.location.href='watch.html?id=${id}'` : ''}"><div class='live-badge'>LIVE</div><img src='${thumbSrc}' alt='${altText}' loading='lazy' onerror="this.onerror=null;this.src='assets/images/logo.png'" /><h6 class='mt-2'>${esc(title)}</h6><small>${esc(category)}</small></div>`;
    }

    return `<div class='match-card' onclick="showCountdownModal('${esc(title)}', ${match.date || 0}, '${esc(thumbSrc)}', '${altText}')"><img src='${thumbSrc}' alt='${altText}' loading='lazy' onerror="this.onerror=null;this.src='assets/images/logo.png'" /><h6 class='mt-2'>${esc(title)}</h6><small>${esc(category)}</small></div>`;
  }).join('');

  container.innerHTML = html;

  // After rendering, ensure carousels are swipe-enabled
  enableCarouselSwipeFor(container);
}

function renderUpcomingMatches(containerId, upcomingMatches) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let upcoming = (upcomingMatches || []).filter(m => (m.date || 0) > Date.now());
  upcoming.sort((a, b) => (a.date || 0) - (b.date || 0));

  if (!upcoming.length) {
    container.innerHTML = '<div class="empty-state">No upcoming football matches.</div>';
    return;
  }

  const html = upcoming.map(match => {
    const imgInfo = getMatchImage(match);
    const thumbSrc = imgInfo.src;
    const altText = esc(imgInfo.alt);
    return `<div class="match-card" onclick="showCountdownModal('${esc(match.title)}', ${match.date || 0}, '${esc(thumbSrc)}', '${altText}')"><img src="${thumbSrc}" alt="${altText}" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo.png'" /><h6 class="mt-2">${esc(match.title)}</h6><small>${esc(match.category)}</small></div>`;
  }).join('');

  container.innerHTML = html;
  enableCarouselSwipeFor(container);
}

/* ---------------- Player Page Rendering with Multi-Source ---------------- */
function loadPlayerPage(matchId) {
  // store current match id so refresh won't affect the playing iframe
  currentMatchId = matchId;

  const player = document.getElementById('player');
  if (!player || !matchId) return;

  fetch(`${apiBase}/live`)
    .then(res => res.json())
    .then(matches => {
      const match = matches.find(m => m.id == matchId);
      if (!match) return alert('Match not found.');

      document.getElementById('matchTitle').textContent = match.title;
      document.getElementById('matchTime').textContent = new Date(match.date).toLocaleString();

      // Stream buttons container - create if missing
      let btnContainer = document.getElementById('streamButtons');
      if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.id = 'streamButtons';
        btnContainer.className = 'my-3 d-flex gap-2 flex-wrap';
        player.parentNode.insertBefore(btnContainer, player.nextSibling);
      }
      btnContainer.innerHTML = '';

      // Helper to fetch and load a source (and mark active button)
      async function fetchAndLoadSource(srcObj, markActive = true) {
        try {
          const res = await fetch(`https://streamed.pk/api/stream/${srcObj.source}/${srcObj.id}`);
          const streams = await res.json();
          const stream = streams && streams[0] ? streams[0] : null;
          if (stream && stream.embedUrl) {
            player.src = stream.embedUrl;
          } else {
            // if no embed, show noStream message (but do not remove iframe)
            const noStreamEl = document.getElementById('noStream');
            if (noStreamEl) noStreamEl.style.display = 'block';
          }

          // active button visual
          if (markActive) {
            document.querySelectorAll('#streamButtons button').forEach(b => {
              b.classList.toggle('active', b.dataset.sourceName && b.dataset.sourceName.toLowerCase() === String(srcObj.source).toLowerCase());
            });
          }
        } catch (err) {
          console.error('Error loading source:', err);
        }
      }

      if (match.sources && match.sources.length > 0) {
        if (match.sources.length === 1) {
          // single source: auto-load, no buttons shown
          fetchAndLoadSource(match.sources[0], false);
        } else {
          // multiple sources: create buttons and load first by default
          match.sources.forEach((src, i) => {
            const btn = document.createElement('button');
            btn.textContent = (src.source || `Source ${i+1}`).toUpperCase();
            btn.className = 'btn btn-sm btn-outline-primary';
            btn.dataset.sourceName = src.source || (`source${i+1}`);
            btn.addEventListener('click', () => fetchAndLoadSource(src, true));
            btnContainer.appendChild(btn);
          });
          // default to first source
          fetchAndLoadSource(match.sources[0], true);
        }
      } else {
        const noStreamEl = document.getElementById('noStream');
        if (noStreamEl) noStreamEl.style.display = 'block';
      }

      // ---------------- Other Matches Sidebar (only live football) ----------------
      const sidebar = document.getElementById('otherMatches');
      if (!sidebar) return;
      sidebar.innerHTML = '';
      const otherLiveFootball = matches.filter(m => m.id != matchId && (m.category || '').toLowerCase() === 'football');
      if (otherLiveFootball.length === 0) {
        sidebar.innerHTML = '<p class="text-muted">No other live football matches.</p>';
        return;
      }

      otherLiveFootball.forEach(m => {
        const div = document.createElement('div');
        div.className = 'col-12 col-sm-6 col-md-12'; // slightly smaller on mobile as requested
        const imgInfo = getMatchImage(m);
        const thumbSrc = imgInfo.src;
        const altText = esc(imgInfo.alt);
        div.innerHTML = `
          <div class="card" style="cursor:pointer">
            ${thumbSrc ? `<img src="${thumbSrc}" alt="${altText}" class="card-img-top" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo.png'">` : ''}
            <div class="card-body p-2">
              <h6>${esc(m.title)}</h6>
              <small class="text-muted">${m.date ? new Date(m.date).toLocaleTimeString() : ''}</small>
            </div>
          </div>`;
        div.addEventListener('click', () => { window.location.href = `watch.html?id=${m.id}`; });
        sidebar.appendChild(div);
      });
    })
    .catch(err => {
      console.error('loadPlayerPage error:', err);
    });
}

/* ---------------- Fetch & Render All Matches ---------------- */
async function fetchAllMatches() {
  try {
    const liveRes = await fetch(`${apiBase}/live`);
    const liveData = normalizeResponse(await liveRes.json());
    const liveIdSet = new Set((liveData || []).map(m => m.id));

    // Render live section (homepage)
    renderMatches('liveMatches', liveData, { liveIdSet });

    // upcoming (exclude live)
    const allRes = await fetch(`${apiBase}/football`);
    const allData = normalizeResponse(await allRes.json());
    const upcoming = (allData || []).filter(m => !liveIdSet.has(m.id));
    renderUpcomingMatches('upcomingMatches', upcoming);

    // popular
    const popularRes = await fetch(`${apiBase}/football/popular`);
    let popularData = normalizeResponse(await popularRes.json()) || [];
    popularData = popularData.map(m => ({ ...m, isLive: !!(m.isLive || liveIdSet.has(m.id) || (m.status && String(m.status).toLowerCase() === 'live')) }));
    renderMatches('popularMatches', popularData, { treatPopularLikeUpcoming: true, liveIdSet });

    // ensure carousels are swipe-enabled after rendering
    enableCarouselSwipeAll();
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

/* ---------------- Update Sidebar Only (for watch page background refresh) ---------------- */
async function updateWatchSidebarOnly(skipMatchId) {
  try {
    const liveRes = await fetch(`${apiBase}/live`);
    const liveData = normalizeResponse(await liveRes.json());
    const sidebar = document.getElementById('otherMatches');
    if (!sidebar) return;

    sidebar.innerHTML = '';
    const otherLiveFootball = liveData.filter(m => m.id != skipMatchId && (m.category || '').toLowerCase() === 'football');
    if (otherLiveFootball.length === 0) {
      sidebar.innerHTML = '<p class="text-muted">No other live football matches.</p>';
      return;
    }

    otherLiveFootball.forEach(m => {
      const div = document.createElement('div');
      div.className = 'col-12 col-sm-6 col-md-12';
      const imgInfo = getMatchImage(m);
      const thumbSrc = imgInfo.src;
      const altText = esc(imgInfo.alt);
      div.innerHTML = `
        <div class="card" style="cursor:pointer">
          ${thumbSrc ? `<img src="${thumbSrc}" alt="${altText}" class="card-img-top" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo.png'">` : ''}
          <div class="card-body p-2">
            <h6>${esc(m.title)}</h6>
            <small class="text-muted">${m.date ? new Date(m.date).toLocaleTimeString() : ''}</small>
          </div>
        </div>`;
      div.addEventListener('click', () => { window.location.href = `watch.html?id=${m.id}`; });
      sidebar.appendChild(div);
    });
  } catch (err) {
    console.error('updateWatchSidebarOnly error:', err);
  }
}

/* ---------------- Carousel Swipe Helpers ---------------- */
function enableCarouselSwipeFor(container) {
  if (!container) return;
  // mark the container to avoid attaching listeners twice
  if (container.dataset.swipeAttached === '1') return;
  container.dataset.swipeAttached = '1';

  let isDown = false;
  let startX;
  let scrollLeft;

  container.addEventListener('mousedown', function (e) {
    isDown = true;
    container.classList.add('active');
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  container.addEventListener('mouseleave', function () {
    isDown = false;
    container.classList.remove('active');
  });

  container.addEventListener('mouseup', function () {
    isDown = false;
    container.classList.remove('active');
  });

  container.addEventListener('mousemove', function (e) {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // scroll speed
    container.scrollLeft = scrollLeft - walk;
  });

  // Touch support
  let touchStartX = 0;
  container.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  container.addEventListener('touchmove', function (e) {
    const touchX = e.touches[0].clientX;
    container.scrollLeft += (touchStartX - touchX) * 1.5;
    touchStartX = touchX;
  }, { passive: true });
}

function enableCarouselSwipeAll() {
  document.querySelectorAll('.slider-container').forEach(container => enableCarouselSwipeFor(container));
}

/* ---------------- Background Refresh ---------------- */
function startBackgroundRefresh() {
  setInterval(() => {
    const player = document.getElementById('player');

    if (player) {
      // On watch page: only update sidebar (do not touch iframe or stream buttons)
      const params = new URLSearchParams(window.location.search);
      const matchId = params.get('id');
      updateWatchSidebarOnly(matchId || currentMatchId);
    } else {
      // On homepage: safe to refresh all sections
      fetchAllMatches();
    }
  }, REFRESH_INTERVAL);
}

/* ---------------- Initialize ---------------- */
fetchAllMatches();

if (document.getElementById('player')) {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get('id');
  if (matchId) loadPlayerPage(matchId);
}

// Start background refresh after initial fetches
startBackgroundRefresh();

// Ensure carousels are enabled on initial load if elements already present
enableCarouselSwipeAll();
