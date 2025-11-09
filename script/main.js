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
  function buildProxyPoster(tokenOrPath) { if (!tokenOrPath) return null; const normalized = String(tokenOrPath).replace(/^\/+/, ''); return isFullUrl(normalized) ? normalized : `https://streamed.pk/api/images/proxy/${normalized}${hasExtension(normalized) ? '' : '.webp'}`; }
  function buildBadgeUrl(badge) { if (!badge) return null; const b = String(badge).replace(/^\/+/, ''); return isFullUrl(b) ? b : `https://streamed.pk/api/images/badge/${b}${hasExtension(b) ? '' : '.webp'}`; }

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
}

/* ---------------- Player Page Rendering with Multi-Source ---------------- */
function loadPlayerPage(matchId) {
  const player = document.getElementById('player');
  if (!player || !matchId) return;

  fetch(`${apiBase}/live`)
    .then(res => res.json())
    .then(matches => {
      const match = matches.find(m => m.id == matchId);
      if (!match) return alert('Match not found.');

      // Load main player info
      document.getElementById('matchTitle').textContent = match.title;
      document.getElementById('matchTime').textContent = new Date(match.date).toLocaleString();

      // Stream buttons container
      let btnContainer = document.getElementById('streamButtons');
      if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.id = 'streamButtons';
        btnContainer.className = 'my-3 d-flex gap-2 flex-wrap';
        player.parentNode.insertBefore(btnContainer, player.nextSibling);
      }
      btnContainer.innerHTML = '';

      function loadSource(source) {
        fetch(`https://streamed.pk/api/stream/${source.source}/${source.id}`)
          .then(res => res.json())
          .then(streams => {
            const stream = streams[0];
            if (stream && stream.embedUrl) player.src = stream.embedUrl;
          });
      }

      if (match.sources && match.sources.length > 0) {
        if (match.sources.length === 1) loadSource(match.sources[0]);
        else {
          match.sources.forEach(src => {
            const btn = document.createElement('button');
            btn.textContent = src.source.toUpperCase();
            btn.className = 'btn btn-sm btn-outline-primary';
            btn.addEventListener('click', () => loadSource(src));
            btnContainer.appendChild(btn);
          });
          loadSource(match.sources[0]);
        }
      } else document.getElementById('noStream').style.display = 'block';

      // Other Matches Sidebar
      const sidebar = document.getElementById('otherMatches');
      if (!sidebar) return;
      sidebar.innerHTML = '';
      const otherLiveFootball = matches.filter(m => m.id != matchId && (m.category || '').toLowerCase() === 'football');
      if (otherLiveFootball.length === 0) sidebar.innerHTML = '<p class="text-muted">No other live football matches.</p>';

      otherLiveFootball.forEach(m => {
        const div = document.createElement('div');
        div.className = 'col-12';
        const imgInfo = getMatchImage(m);
        const thumbSrc = imgInfo.src;
        const altText = esc(imgInfo.alt);
        div.innerHTML = `<div class="card">${thumbSrc ? `<img src="${thumbSrc}" alt="${altText}" class="card-img-top" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo.png'">` : ''}<div class="card-body p-2"><h6>${esc(m.title)}</h6><small class="text-muted">${m.date ? new Date(m.date).toLocaleTimeString() : ''}</small></div></div>`;
        div.addEventListener('click', () => { window.location.href = `watch.html?id=${m.id}`; });
        sidebar.appendChild(div);
      });
    });
}

/* ---------------- Fetch & Render All Matches ---------------- */
async function fetchAllMatches() {
  try {
    const liveRes = await fetch(`${apiBase}/live`);
    const liveData = normalizeResponse(await liveRes.json());
    const liveIdSet = new Set((liveData || []).map(m => m.id));
    renderMatches('liveMatches', liveData, { liveIdSet });

    const allRes = await fetch(`${apiBase}/football`);
    const allData = normalizeResponse(await allRes.json());
    const upcoming = (allData || []).filter(m => !liveIdSet.has(m.id));
    renderUpcomingMatches('upcomingMatches', upcoming);

    const popularRes = await fetch(`${apiBase}/football/popular`);
    let popularData = normalizeResponse(await popularRes.json()) || [];
    popularData = popularData.map(m => ({ ...m, isLive: !!(m.isLive || liveIdSet.has(m.id) || (m.status && String(m.status).toLowerCase() === 'live')) }));
    renderMatches('popularMatches', popularData, { treatPopularLikeUpcoming: true, liveIdSet });
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

/* ---------------- Initialize ---------------- */
fetchAllMatches();
if (document.getElementById('player')) {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get('id');
  if (matchId) loadPlayerPage(matchId);
}
