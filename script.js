/**
 * Ángela Bendeck — script.js  (v2 — Android/iOS touch fixed)
 * Fixes: touch events, z-index stacking, iframe interaction,
 *        interactive video per song, smooth scroll on mobile
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     SONG → VIDEO MAP
     Add a videoId for every song card that has one.
     Cards without a videoId will show the default embed.
     ══════════════════════════════════════════════════════════ */
  var SONG_VIDEOS = {
    'Mi Felicidad':          'WkLNKKV_D8Y',
    'Say I\'m Possible':     'ZNWZFCdJXBw',   // update with real IDs
    'Show Up':               '',               // leave empty = keep default
    'OK Monday':             '',
    'Platónico':             '',
    'Así Te Amo, Honduras':  '',
    'Hope in My Soul':       '',
    'Mi Sol':                ''
  };

  var DEFAULT_VIDEO_ID = 'WkLNKKV_D8Y'; // Mi Felicidad

  /* ══════════════════════════════════════════════════════════
     1. UTILITY
     ══════════════════════════════════════════════════════════ */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ══════════════════════════════════════════════════════════
     2. iOS VIEWPORT HEIGHT FIX  (run first, before layout)
     ══════════════════════════════════════════════════════════ */
  function setVH() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setVH();
  window.addEventListener('resize',            setVH, { passive: true });
  window.addEventListener('orientationchange', function () { setTimeout(setVH, 250); }, { passive: true });

  /* ══════════════════════════════════════════════════════════
     3. NAV — scroll shrink + mobile burger
        KEY FIX: overlay must NOT cover nav links or page content
        when menu is CLOSED. Use pointer-events: none when inactive.
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

  /* Overlay click closes menu */
  navOverlay.addEventListener('click', closeMenu);

  /* Each nav link closes menu on tap */
  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (isMenuOpen) closeMenu();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isMenuOpen) closeMenu();
  });

  /* ══════════════════════════════════════════════════════════
     4. SMOOTH SCROLL — unified, works on Android & iOS
        Uses getBoundingClientRect for reliability.
        Falls back to CSS scroll-behavior when available.
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
      /* Safari < 14 fallback */
      smoothScrollTo(top, 600);
    }
  }

  function smoothScrollTo(targetY, duration) {
    var startY    = window.pageYOffset;
    var distance  = targetY - startY;
    var startTime = null;
    function step(now) {
      if (!startTime) startTime = now;
      var t = Math.min((now - startTime) / duration, 1);
      var ease = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
      window.scrollTo(0, startY + distance * ease);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* Attach to ALL anchor links */
  $$('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = anchor.getAttribute('href');
      if (id === '#') return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      if (isMenuOpen) closeMenu();
      /* Small delay so menu slide-out doesn't fight scroll */
      setTimeout(function () { scrollToSection(target); }, isMenuOpen ? 350 : 0);
    });
  });

  /* ══════════════════════════════════════════════════════════
     5. IFRAME — load on demand + Android interaction fix
        Android WebView blocks iframes with src="about:blank".
        Solution: inject a real YouTube nocookie URL when the
        section comes into view, wrapped in a tap-to-play
        overlay so Android's touch restrictions don't block it.
     ══════════════════════════════════════════════════════════ */
  var videoWrap   = $('.video-wrap__inner');
  var currentVideoId = DEFAULT_VIDEO_ID;
  var iframeLoaded   = false;

  function buildYouTubeUrl(videoId) {
    return 'https://www.youtube-nocookie.com/embed/' + videoId
      + '?rel=0&modestbranding=1&playsinline=1&enablejsapi=0';
  }

  function loadIframe(videoId) {
    if (!videoWrap) return;
    videoId = videoId || DEFAULT_VIDEO_ID;

    /* Remove old iframe / overlay */
    videoWrap.innerHTML = '';

    /* ── Tap-to-play overlay (critical for Android) ── */
    var overlay = document.createElement('div');
    overlay.className = 'yt-overlay';
    overlay.setAttribute('role', 'button');
    overlay.setAttribute('tabindex', '0');
    overlay.setAttribute('aria-label', 'Play video on YouTube');
    overlay.innerHTML =
      '<div class="yt-overlay__thumb" style="background-image:url(https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg)">' +
      '<div class="yt-overlay__play"><svg viewBox="0 0 68 48" xmlns="http://www.w3.org/2000/svg"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#ff0000"/><path d="M45 24 27 14v20" fill="#fff"/></svg></div>' +
      '</div>';

    function activateIframe() {
      overlay.style.display = 'none';
      var iframe = document.createElement('iframe');
      iframe.src = buildYouTubeUrl(videoId) + '&autoplay=1';
      iframe.title = 'Ángela Bendeck video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.setAttribute('frameborder', '0');
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
      videoWrap.appendChild(iframe);
      iframeLoaded = true;
    }

    overlay.addEventListener('click',     activateIframe);
    overlay.addEventListener('touchend',  function (e) { e.preventDefault(); activateIframe(); });
    overlay.addEventListener('keydown',   function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateIframe(); } });

    videoWrap.appendChild(overlay);
  }

  /* Load when video section scrolls into view */
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
     6. SONG CARDS — tap to flip + change video
        Touch fix: use touchstart to detect intent, touchend to
        confirm (prevents ghost clicks on Android).
     ══════════════════════════════════════════════════════════ */
  var songCards   = $$('.song-card');
  var videoCaption = $('.video-wrap__caption .gold');

  function flipCard(card) {
    var isFlipped = card.classList.contains('flipped');
    songCards.forEach(function (c) { c.classList.remove('flipped'); });
    if (!isFlipped) {
      card.classList.add('flipped');

      /* Change video */
      var titleEl  = card.querySelector('.song-card__title');
      var titleTxt = titleEl ? titleEl.textContent.trim() : '';
      var videoId  = SONG_VIDEOS[titleTxt];

      if (videoId !== undefined && videoId !== '' && videoId !== currentVideoId) {
        currentVideoId = videoId;

        /* Update caption */
        if (videoCaption) videoCaption.textContent = titleTxt;

        /* Reload iframe with new video */
        loadIframe(currentVideoId);

        /* Scroll to video so user sees it */
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
      if (touchMoved) return;       /* user was scrolling, not tapping */
      e.preventDefault();           /* prevent ghost click 300ms later  */
      flipCard(card);
    });

    /* Desktop mouse click */
    card.addEventListener('click', function (e) {
      e.stopPropagation();
      flipCard(card);
    });

    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipCard(card); }
    });
  });

  /* Tap anywhere else to close flipped card */
  document.addEventListener('click',    function () { songCards.forEach(function (c) { c.classList.remove('flipped'); }); });
  document.addEventListener('touchend', function () { songCards.forEach(function (c) { c.classList.remove('flipped'); }); });

  /* ══════════════════════════════════════════════════════════
     7. REVEAL ANIMATIONS
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
     8. ACTIVE NAV LINK
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
     9. AUTO-SCROLL TO VIDEO on first load (after 1.2s)
        Gives the hero animation time to finish, then gently
        scrolls so the video is visible.
     ══════════════════════════════════════════════════════════ */
  setTimeout(function () {
    if (musicSection) scrollToSection(musicSection);
  }, 1200);

})();
