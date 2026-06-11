/**
 * Ángela Bendeck — script.js  (v3 — YouTube embed fix)
 * Fixes: touch events, iframe interaction, autoplay policy,
 *        SVG pointer-events, double-fire prevention
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     SONG → VIDEO MAP
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

  var DEFAULT_VIDEO_ID = 'https://youtu.be/dvvh-z3hXUM?si=3PRlVJ1TFUAvTA4n';

  /* ══════════════════════════════════════════════════════════
     1. UTILITY
     ══════════════════════════════════════════════════════════ */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ══════════════════════════════════════════════════════════
     2. iOS VIEWPORT HEIGHT FIX
     ══════════════════════════════════════════════════════════ */
  function setVH() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setVH();
  window.addEventListener('resize',            setVH, { passive: true });
  window.addEventListener('orientationchange', function () { setTimeout(setVH, 250); }, { passive: true });

  /* ══════════════════════════════════════════════════════════
     3. NAV
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
     4. SMOOTH SCROLL
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
      var t = Math.min((now - startTime) / duration, 1);
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
     5. IFRAME — YouTube embed fix

     ROOT CAUSE of "video not available" / redirect to YouTube:
     ① autoplay=1 alone doesn't work — needs mute=1 on mobile
        OR we open inside an actual user-gesture handler.
     ② The SVG inside .yt-overlay__play was catching the tap
        and NOT bubbling correctly on some Android WebViews.
     ③ Double-fire: both touchend+click were calling activate.

     SOLUTION:
     - Add pointer-events:none to everything INSIDE the overlay
       so the overlay div itself always receives the event.
     - Use a single "activated" flag to prevent double-fire.
     - Use youtube-nocookie + rel=0 + modestbranding.
     - For autoplay: include autoplay=1&mute=0. On iOS/Android
       this works when triggered from a real touch/click handler.
     ══════════════════════════════════════════════════════════ */
  var videoWrap      = $('.video-wrap__inner');
  var currentVideoId = DEFAULT_VIDEO_ID;

  function buildYouTubeUrl(videoId, autoplay) {
    return 'https://www.youtube-nocookie.com/embed/' + videoId
      + '?rel=0&modestbranding=1&playsinline=1'
      + (autoplay ? '&autoplay=1' : '');
  }

  function loadIframe(videoId) {
    if (!videoWrap) return;
    videoId = videoId || DEFAULT_VIDEO_ID;

    videoWrap.innerHTML = '';

    /* ── Thumbnail overlay ── */
    var overlay = document.createElement('div');
    overlay.className = 'yt-overlay';
    overlay.setAttribute('role', 'button');
    overlay.setAttribute('tabindex', '0');
    overlay.setAttribute('aria-label', 'Play video');

    /* CRITICAL: pointer-events:none on children so the overlay
       div itself always receives the touch/click event         */
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
      /* autoplay works when called from a real user gesture */
      iframe.src = buildYouTubeUrl(videoId, true);
      iframe.title = 'Ángela Bendeck video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.setAttribute('frameborder', '0');
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
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
     6. SONG CARDS
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
      var videoId  = SONG_VIDEOS[titleTxt];

      if (videoId !== undefined && videoId !== '' && videoId !== currentVideoId) {
        currentVideoId = videoId;
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
     9. AUTO-SCROLL TO VIDEO on first load
     ══════════════════════════════════════════════════════════ */
  setTimeout(function () {
    if (musicSection) scrollToSection(musicSection);
  }, 1200);

})();
