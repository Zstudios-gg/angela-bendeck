/**
 * Ángela Bendeck — script.js  (v4 — YouTube ID fix + fallback link)
 * Fixes:
 *  - Extracts clean video ID from any YouTube URL format (youtu.be, watch?v=, ?si=, etc.)
 *  - Shows a "Ver en YouTube" fallback link if embed fails or is blocked
 *  - Touch events, iframe interaction, autoplay policy
 *  - SVG pointer-events, double-fire prevention
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     SONG → VIDEO MAP  (full YouTube URLs — IDs extracted automatically)
     ══════════════════════════════════════════════════════════ */
  var SONG_VIDEOS = {
    'Mi Felicidad':          'https://youtu.be/dvvh-z3hXUM?si=3PRlVJ1TFUAvTA4n',
    'Say I\'m Possible':     'https://youtu.be/flz1K0ghKhU?si=eI9N6kesSUqx_Ajf',
    'Show Up':               'https://youtu.be/0TOXQV4pDbQ?si=ajXKs4EpbXtFxeXC',
    'OK Monday':             'https://youtu.be/C_suplZN-Kg?si=-9eu-mKeMcFRtBh0',
    'Platónico':             'https://youtu.be/gYgaT9TmPvE?si=2cNsmOTIznuss7V5',
    'Así Te Amo, Honduras':  'https://youtu.be/NOLcyDB7voo?si=7kO56nVkjK3lFsxW',
    'Hope in My Soul':       'https://youtu.be/SBn82rmLXdA?si=APetOzdrwgBweNBa',
    'Mi Sol':                'https://youtu.be/mRfKqPqvk-o?si=3VIdhYkIHTtGwMP_'
  };

  var DEFAULT_VIDEO_URL = 'https://youtu.be/dvvh-z3hXUM?si=3PRlVJ1TFUAvTA4n';

  /* ══════════════════════════════════════════════════════════
     1. UTILITY
     ══════════════════════════════════════════════════════════ */
  function $(sel, ctx)  { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ══════════════════════════════════════════════════════════
     2. EXTRACT YOUTUBE VIDEO ID from any URL format
        Handles: youtu.be/ID, watch?v=ID, embed/ID, ?si=..., bare ID
     ══════════════════════════════════════════════════════════ */
  function extractYouTubeId(url) {
    if (!url) return null;
    // Already a bare 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    // youtu.be/ID
    var m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    // youtube.com/watch?v=ID  or  ?v=ID anywhere
    m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    // youtube.com/embed/ID
    m = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    return null;
  }

  /* ══════════════════════════════════════════════════════════
     3. iOS VIEWPORT HEIGHT FIX
     ══════════════════════════════════════════════════════════ */
  function setVH() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setVH();
  window.addEventListener('resize',            setVH, { passive: true });
  window.addEventListener('orientationchange', function () { setTimeout(setVH, 250); }, { passive: true });

  /* ══════════════════════════════════════════════════════════
     4. NAV
     ══════════════════════════════════════════════════════════ */
  var nav        = $('#nav');
  var burger     = $('#burger');
  var navMenu    = $('#nav-menu');
  var navOverlay = $('#nav-overlay');
  var navLinks   = $$('.nav__link');
  var isMenuOpen = false;

  function onScroll() {
    nav.classList.toggle('nav--scrolled', window.scrollY > 20);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function openMenu() {
    isMenuOpen = true;
    navMenu.classList.add('open');
    navOverlay.classList.add('active');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    isMenuOpen = false;
    navMenu.classList.remove('open');
    navOverlay.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    isMenuOpen ? closeMenu() : openMenu();
  });

  navOverlay.addEventListener('click', closeMenu);

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (isMenuOpen) closeMenu();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isMenuOpen) closeMenu();
  });

  /* ══════════════════════════════════════════════════════════
     5. SMOOTH SCROLL
     ══════════════════════════════════════════════════════════ */
  var NAV_HEIGHT = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '60',
    10
  );

  function scrollToSection(targetEl) {
    if (!targetEl) return;
    var top = targetEl.getBoundingClientRect().top + window.pageYOffset - NAV_HEIGHT - 8;
    try {
      window.scrollTo({ top: top, behavior: 'smooth' });
    } catch (e) {
      smoothScrollTo(top, 600);
    }
  }

  function smoothScrollTo(targetY, duration) {
    var startY    = window.pageYOffset;
    var distance  = targetY - startY;
    var startTime = null;
    function step(now) {
      if (!startTime) startTime = now;
      var t    = Math.min((now - startTime) / duration, 1);
      var ease = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
      window.scrollTo(0, startY + distance * ease);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  $$('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = anchor.getAttribute('href');
      if (id === '#') return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      if (isMenuOpen) closeMenu();
      setTimeout(function () { scrollToSection(target); }, isMenuOpen ? 350 : 0);
    });
  });

  /* ══════════════════════════════════════════════════════════
     6. FALLBACK — shown when YouTube embed is blocked
     ══════════════════════════════════════════════════════════ */
  function showFallbackLink(videoId) {
    if (!videoWrap) return;
    videoWrap.innerHTML = '';

    var ytUrl    = 'https://www.youtube.com/watch?v=' + videoId;
    var fallback = document.createElement('a');
    fallback.href   = ytUrl;
    fallback.target = '_blank';
    fallback.rel    = 'noopener noreferrer';
    fallback.style.cssText =
      'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:14px;background:#0a0a0a;color:#fff;font-family:inherit;' +
      'text-decoration:none;border-radius:12px;padding:24px;text-align:center;cursor:pointer;';

    fallback.innerHTML =
      '<svg viewBox="0 0 68 48" width="72" height="52" aria-hidden="true">' +
        '<path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#ff0000"/>' +
        '<path d="M45 24 27 14v20" fill="#fff"/>' +
      '</svg>' +
      '<span style="font-size:1.05rem;font-weight:700;color:#fff;">Ver en YouTube</span>' +
      '<span style="font-size:0.82rem;color:#aaa;line-height:1.5;">Este video no puede reproducirse aquí.<br>Toca para abrirlo directamente en YouTube.</span>';

    videoWrap.appendChild(fallback);
  }

  /* ══════════════════════════════════════════════════════════
     7. IFRAME — build embed URL
     ══════════════════════════════════════════════════════════ */
  var videoWrap      = $('.video-wrap__inner');
  var currentVideoId = DEFAULT_VIDEO_URL;  /* stored as full URL; ID extracted on use */

  function buildYouTubeUrl(videoId, autoplay) {
    return 'https://www.youtube-nocookie.com/embed/' + videoId +
      '?rel=0&modestbranding=1&playsinline=1' +
      (autoplay ? '&autoplay=1' : '');
  }

  /* ══════════════════════════════════════════════════════════
     8. LOAD IFRAME
        videoUrl can be a full YouTube URL or a bare video ID.
        We always extract the clean 11-char ID before use.
     ══════════════════════════════════════════════════════════ */
  function loadIframe(videoUrl) {
    if (!videoWrap) return;

    var videoId = extractYouTubeId(videoUrl) || extractYouTubeId(DEFAULT_VIDEO_URL);
    if (!videoId) { showFallbackLink(''); return; }

    videoWrap.innerHTML = '';

    /* ── Thumbnail overlay ── */
    var overlay = document.createElement('div');
    overlay.className = 'yt-overlay';
    overlay.setAttribute('role', 'button');
    overlay.setAttribute('tabindex', '0');
    overlay.setAttribute('aria-label', 'Play video');

    /* pointer-events:none on children so overlay div always receives the event */
    overlay.innerHTML =
      '<div class="yt-overlay__thumb" style="background-image:url(https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg);pointer-events:none">' +
        '<div class="yt-overlay__play" style="pointer-events:none">' +
          '<svg viewBox="0 0 68 48" xmlns="http://www.w3.org/2000/svg" style="pointer-events:none">' +
            '<path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#ff0000"/>' +
            '<path d="M45 24 27 14v20" fill="#fff"/>' +
          '</svg>' +
        '</div>' +
      '</div>';

    var activated = false; /* prevent double-fire */

    function activateIframe(e) {
      if (activated) return;
      activated = true;
      if (e && e.preventDefault) e.preventDefault();

      overlay.style.display = 'none';

      var iframe = document.createElement('iframe');
      iframe.src           = buildYouTubeUrl(videoId, true);
      iframe.title         = 'Ángela Bendeck video';
      iframe.allow         = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.setAttribute('frameborder', '0');
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';

      /*
       * YouTube embeds that are blocked don't fire iframe 'error' —
       * they load successfully but show an error page inside.
       * We use a postMessage listener: YouTube sends specific messages
       * when the player initialises. If we get no message within 8s
       * after load, we assume it's blocked and show the fallback.
       */
      var loadedOnce  = false;
      var fallbackTimer = null;

      function onYTMessage(evt) {
        // YouTube player API sends JSON strings
        if (typeof evt.data !== 'string') return;
        try {
          var data = JSON.parse(evt.data);
          // Any valid YT postMessage means embed is working
          if (data.event || data.info !== undefined) {
            loadedOnce = true;
            clearTimeout(fallbackTimer);
            window.removeEventListener('message', onYTMessage);
          }
        } catch (_) {}
      }

      window.addEventListener('message', onYTMessage);

      iframe.addEventListener('load', function () {
        // Give YouTube 8s to send its first postMessage
        fallbackTimer = setTimeout(function () {
          if (!loadedOnce) {
            window.removeEventListener('message', onYTMessage);
            showFallbackLink(videoId);
          }
        }, 8000);
      });

      iframe.addEventListener('error', function () {
        clearTimeout(fallbackTimer);
        window.removeEventListener('message', onYTMessage);
        showFallbackLink(videoId);
      });

      videoWrap.appendChild(iframe);
    }

    /* Use BOTH touchend and click but guard with `activated` flag */
    overlay.addEventListener('touchend',  activateIframe, { passive: false });
    overlay.addEventListener('click',     activateIframe);
    overlay.addEventListener('keydown',   function (e) {
      if (e.key === 'Enter' || e.key === ' ') activateIframe(e);
    });

    videoWrap.appendChild(overlay);
  }

  /* Load when music section scrolls into view */
  var musicSection = $('#music');
  if (musicSection && 'IntersectionObserver' in window) {
    var videoObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        loadIframe(currentVideoId);
        videoObserver.disconnect();
      }
    }, { rootMargin: '300px' });
    videoObserver.observe(musicSection);
  } else if (videoWrap) {
    loadIframe(currentVideoId);
  }

  /* ══════════════════════════════════════════════════════════
     9. SONG CARDS
     ══════════════════════════════════════════════════════════ */
  var songCards    = $$('.song-card');
  var videoCaption = $('.video-wrap__caption .gold');

  function flipCard(card) {
    var isFlipped = card.classList.contains('flipped');
    songCards.forEach(function (c) { c.classList.remove('flipped'); });
    if (!isFlipped) {
      card.classList.add('flipped');

      var titleEl  = card.querySelector('.song-card__title');
      var titleTxt = titleEl ? titleEl.textContent.trim() : '';
      var videoUrl = SONG_VIDEOS[titleTxt];

      if (videoUrl !== undefined && videoUrl !== '' && videoUrl !== currentVideoId) {
        currentVideoId = videoUrl;
        if (videoCaption) videoCaption.textContent = titleTxt;
        loadIframe(currentVideoId);
        scrollToSection(musicSection);
      }
    }
  }

  songCards.forEach(function (card) {
    var touchMoved = false;

    card.addEventListener('touchstart', function () {
      touchMoved = false;
    }, { passive: true });

    card.addEventListener('touchmove', function () {
      touchMoved = true;
    }, { passive: true });

    card.addEventListener('touchend', function (e) {
      if (touchMoved) return;
      e.preventDefault();
      flipCard(card);
    });

    card.addEventListener('click', function (e) {
      e.stopPropagation();
      flipCard(card);
    });

    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipCard(card); }
    });
  });

  document.addEventListener('click',    function () { songCards.forEach(function (c) { c.classList.remove('flipped'); }); });
  document.addEventListener('touchend', function () { songCards.forEach(function (c) { c.classList.remove('flipped'); }); });

  /* ══════════════════════════════════════════════════════════
     10. REVEAL ANIMATIONS
     ══════════════════════════════════════════════════════════ */
  var revealEls = $$('.reveal');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el    = entry.target;
        var delay = parseInt(el.dataset.delay || '0', 10);
        if (delay > 0) {
          setTimeout(function () { el.classList.add('visible'); }, delay);
        } else {
          el.classList.add('visible');
        }
        revealObserver.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ══════════════════════════════════════════════════════════
     11. ACTIVE NAV LINK
     ══════════════════════════════════════════════════════════ */
  var sections = $$('section[id]');

  function updateActiveLink() {
    var scrollY = window.scrollY + NAV_HEIGHT + 40;
    sections.forEach(function (section) {
      var top    = section.offsetTop;
      var bottom = top + section.offsetHeight;
      var id     = section.getAttribute('id');
      var link   = $('.nav__link[href="#' + id + '"]');
      if (!link) return;
      if (scrollY >= top && scrollY < bottom) {
        navLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
        link.setAttribute('aria-current', 'page');
      }
    });
  }
  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();

  /* ══════════════════════════════════════════════════════════
     12. AUTO-SCROLL TO VIDEO on first load
     ══════════════════════════════════════════════════════════ */
  setTimeout(function () {
    if (musicSection) scrollToSection(musicSection);
  }, 1200);

})();
