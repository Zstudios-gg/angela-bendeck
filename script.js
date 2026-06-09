/**
 * Ángela Bendeck — script.js
 * Vanilla JS only · Safari/iOS/Android safe · No libraries
 * Tested patterns: IntersectionObserver, passive listeners,
 * touch events, iframe lazy-load, nav burger
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     1. UTILITY
     ══════════════════════════════════════════════════════════ */
  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }

  /* ══════════════════════════════════════════════════════════
     2. NAV — scroll shrink + mobile burger
     ══════════════════════════════════════════════════════════ */
  var nav        = $('#nav');
  var burger     = $('#burger');
  var navMenu    = $('#nav-menu');
  var navOverlay = $('#nav-overlay');
  var navLinks   = $$('.nav__link');
  var isMenuOpen = false;

  /* Scroll — add/remove class for background change */
  function onScroll() {
    if (window.scrollY > 20) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
  }

  /* Passive listener — safe on iOS, doesn't block scroll */
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load

  /* Open menu */
  function openMenu() {
    isMenuOpen = true;
    navMenu.classList.add('open');
    navOverlay.classList.add('active');
    burger.setAttribute('aria-expanded', 'true');
    /* Prevent body scroll while menu is open — iOS fix */
    document.body.style.overflow = 'hidden';
  }

  /* Close menu */
  function closeMenu() {
    isMenuOpen = false;
    navMenu.classList.remove('open');
    navOverlay.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', function () {
    if (isMenuOpen) { closeMenu(); } else { openMenu(); }
  });

  navOverlay.addEventListener('click', closeMenu);

  /* Close on nav link click (mobile) */
  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (isMenuOpen) { closeMenu(); }
    });
  });

  /* Close on Escape key */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isMenuOpen) { closeMenu(); }
  });

  /* ══════════════════════════════════════════════════════════
     3. REVEAL ANIMATIONS — IntersectionObserver
        Fallback: if Observer not supported, show all elements
     ══════════════════════════════════════════════════════════ */
  var revealEls = $$('.reveal');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el    = entry.target;
          var delay = parseInt(el.dataset.delay || '0', 10);

          /* Use setTimeout only for non-zero delays */
          if (delay > 0) {
            setTimeout(function () { el.classList.add('visible'); }, delay);
          } else {
            el.classList.add('visible');
          }

          /* Stop observing once revealed */
          revealObserver.unobserve(el);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });

  } else {
    /* Fallback — no Observer support (very old browsers) */
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ══════════════════════════════════════════════════════════
     4. SONG CARDS — tap/click to flip (mobile-safe)
        Uses pointer events to unify mouse + touch
     ══════════════════════════════════════════════════════════ */
  var songCards = $$('.song-card');

  songCards.forEach(function (card) {
    card.addEventListener('click', function (e) {
      /* If already flipped, unflip */
      var isFlipped = card.classList.contains('flipped');

      /* Close all other cards first */
      songCards.forEach(function (c) { c.classList.remove('flipped'); });

      if (!isFlipped) {
        card.classList.add('flipped');
      }

      /* Stop propagation so the document listener below
         doesn't immediately close it */
      e.stopPropagation();
    });

    /* Keyboard: allow Enter/Space for accessibility */
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  /* Click anywhere else → close all flipped cards */
  document.addEventListener('click', function () {
    songCards.forEach(function (c) { c.classList.remove('flipped'); });
  });

  /* ══════════════════════════════════════════════════════════
     5. IFRAME LAZY LOAD — swap data-src on scroll
        Avoids autoloading YouTube (better performance + iOS)
     ══════════════════════════════════════════════════════════ */
  var iframes = $$('iframe[data-src]');

  if (iframes.length > 0) {
    if ('IntersectionObserver' in window) {
      var iframeObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var iframe = entry.target;
            iframe.src = iframe.dataset.src;
            delete iframe.dataset.src;
            iframeObserver.unobserve(iframe);
          }
        });
      }, { rootMargin: '200px' });

      iframes.forEach(function (iframe) {
        iframeObserver.observe(iframe);
      });
    } else {
      /* Fallback — load immediately */
      iframes.forEach(function (iframe) {
        if (iframe.dataset.src) {
          iframe.src = iframe.dataset.src;
        }
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     6. SMOOTH SCROLL — Safari < 15.4 doesn't support
        scroll-behavior: smooth on anchor clicks
     ══════════════════════════════════════════════════════════ */
  var NAV_HEIGHT = 60;

  $$('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id     = anchor.getAttribute('href');
      var target = $(id);

      if (!target) { return; }

      e.preventDefault();

      var top = target.getBoundingClientRect().top
                + window.pageYOffset
                - NAV_HEIGHT;

      /* Use native if supported, fallback to manual */
      if ('scrollBehavior' in document.documentElement.style) {
        window.scrollTo({ top: top, behavior: 'smooth' });
      } else {
        /* Simple step-based fallback */
        smoothScrollTo(top, 600);
      }
    });
  });

  function smoothScrollTo(targetY, duration) {
    var startY    = window.pageYOffset;
    var distance  = targetY - startY;
    var startTime = null;

    function step(currentTime) {
      if (!startTime) { startTime = currentTime; }
      var elapsed  = currentTime - startTime;
      var progress = Math.min(elapsed / duration, 1);
      /* Ease in-out quad */
      var ease     = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      window.scrollTo(0, startY + distance * ease);
      if (elapsed < duration) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  /* ══════════════════════════════════════════════════════════
     7. ACTIVE NAV LINK — highlight current section
     ══════════════════════════════════════════════════════════ */
  var sections = $$('section[id]');

  function updateActiveLink() {
    var scrollY = window.scrollY + NAV_HEIGHT + 40;

    sections.forEach(function (section) {
      var top    = section.offsetTop;
      var bottom = top + section.offsetHeight;
      var id     = section.getAttribute('id');
      var link   = $('.nav__link[href="#' + id + '"]');

      if (!link) { return; }

      if (scrollY >= top && scrollY < bottom) {
        navLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();

  /* ══════════════════════════════════════════════════════════
     8. iOS VIEWPORT HEIGHT FIX
        On iOS, 100vh includes the browser toolbar which
        causes overflow. This sets a CSS variable instead.
     ══════════════════════════════════════════════════════════ */
  function setVH() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }

  /* Run on load and on resize (landscape/portrait switch) */
  setVH();
  window.addEventListener('resize', setVH, { passive: true });
  /* Also run on orientation change (iOS specific) */
  window.addEventListener('orientationchange', function () {
    /* Small delay to wait for layout to settle */
    setTimeout(setVH, 200);
  }, { passive: true });

})();
