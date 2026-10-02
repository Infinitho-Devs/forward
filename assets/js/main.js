/* ==========================================================================
   Forward Access — Interacciones y animaciones
   Depende de: GSAP + ScrollTrigger + SplitText, Lenis (opcionales: el sitio
   funciona igual si no cargan, solo sin animaciones).
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Configuración
     ------------------------------------------------------------------ */
  var CONFIG = {
    email: 'forwardaccesssrl@gmail.com',
    // Si tienes un servicio para recibir formularios (Formspree, FormSubmit,
    // un PHP propio, etc.) coloca aquí la URL y los formularios se enviarán
    // directamente (POST, FormData). Si se deja vacío, se abre el correo
    // del visitante con el mensaje ya redactado hacia CONFIG.email.
    // Ejemplos: 'https://formspree.io/f/xxxxxxx'  ·  'enviar.php'
    formEndpoint: ''
  };

  window.__fa = true;
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var animate = hasGSAP && !reduceMotion;

  function storage(key, value) {
    try {
      if (value === undefined) return window.sessionStorage.getItem(key);
      window.sessionStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  if (!animate) {
    root.classList.add('no-anim');
    root.classList.remove('is-loading');
  }

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
  }

  /* ------------------------------------------------------------------
     Scroll suave (solo escritorio)
     ------------------------------------------------------------------ */
  var lenis = null;
  if (animate && window.Lenis && finePointer) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : -90, duration: 1.4 });
    else {
      var y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  function lockScroll(lock) {
    document.body.classList.toggle('is-locked', lock);
    if (lenis) lock ? lenis.stop() : lenis.start();
  }

  /* ------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------ */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var toastEl = null, toastTimer = null;
  function toast(message, type) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    var icon = type === 'error' ? 'x' : 'check';
    toastEl.classList.toggle('is-error', type === 'error');
    toastEl.innerHTML = '<span class="toast__icon"><svg class="icon" aria-hidden="true"><use href="#i-' + icon + '"/></svg></span><span></span>';
    toastEl.lastChild.textContent = message;
    requestAnimationFrame(function () { toastEl.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 5200);
  }

  /* ------------------------------------------------------------------
     Navegación: estado al hacer scroll, ocultar/mostrar
     ------------------------------------------------------------------ */
  var nav = $('.nav');
  var menu = $('.menu');
  var toggle = $('.nav__toggle');
  var menuOpen = false;

  (function initNav() {
    if (!nav) return;
    var lastY = window.pageYOffset, ticking = false;
    function update() {
      var y = window.pageYOffset;
      nav.classList.toggle('is-scrolled', y > 24);
      if (!menuOpen) {
        if (y > lastY + 6 && y > 320) nav.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 320) nav.classList.remove('is-hidden');
      }
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  function setMenu(open) {
    if (!menu || !toggle) return;
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    nav.classList.toggle('is-open', open);
    nav.classList.remove('is-hidden');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', String(!open));
    if ('inert' in menu) menu.inert = !open;
    lockScroll(open);
  }
  if (menu) { if ('inert' in menu) menu.inert = true; }
  if (toggle) toggle.addEventListener('click', function () { setMenu(!menuOpen); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); toggle.focus(); } });
  window.addEventListener('resize', function () { if (menuOpen && window.innerWidth >= 1080) setMenu(false); });

  /* ------------------------------------------------------------------
     Transiciones entre páginas
     ------------------------------------------------------------------ */
  var pt = $('.pt');
  var leaving = false;

  function isInternalPageLink(a, e) {
    if (!a || !a.href) return false;
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download') || a.hasAttribute('data-no-transition')) return false;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return false; }
    if (url.protocol !== location.protocol || url.host !== location.host) return false;
    if (url.pathname === location.pathname && url.search === location.search) return false;
    return true;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) return;

    // Anclas dentro de la misma página
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#' && href.length > 1) {
      var id = href.slice(1);
      var target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        if (menuOpen) setMenu(false);
        // "#top" apunta al encabezado fijo: se sube siempre al inicio de la página
        scrollToTarget(id === 'top' || getComputedStyle(target).position === 'fixed' ? 0 : target);
      }
      return;
    }

    if (!animate || !pt || leaving || !isInternalPageLink(a, e)) return;
    e.preventDefault();
    leaving = true;
    var dest = a.href;
    if (menuOpen) { menu.classList.remove('is-open'); }
    root.classList.add('is-leaving');
    gsap.timeline({ onComplete: function () { window.location.href = dest; } })
      .set('.pt__panel', { transformOrigin: 'bottom' })
      .fromTo('.pt__panel--accent', { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: 'expo.inOut' })
      .fromTo('.pt__panel--ink', { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: 'expo.inOut' }, '<0.09')
      .fromTo('.pt__brand', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, '-=0.15')
      .set('.pt__progress', { autoAlpha: 0 }, 0);
  });

  // Prefetch al pasar el mouse para que la navegación sea instantánea
  if (finePointer) {
    var prefetched = {};
    document.addEventListener('mouseover', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a || !isInternalPageLink(a) || prefetched[a.href] || location.protocol === 'file:') return;
      prefetched[a.href] = true;
      var l = document.createElement('link');
      l.rel = 'prefetch'; l.href = a.href;
      document.head.appendChild(l);
    });
  }

  // Al volver con el botón "atrás" (bfcache) la cortina debe estar abierta
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && hasGSAP) {
      leaving = false;
      root.classList.remove('is-leaving', 'is-loading');
      gsap.set('.pt__panel', { scaleY: 0 });
      gsap.set('.pt__brand', { autoAlpha: 0 });
    }
  });

  /* ------------------------------------------------------------------
     Entrada de página (preloader la primera vez)
     ------------------------------------------------------------------ */
  var introTimelines = [];

  function playEnter() {
    if (!animate || !pt) { introTimelines.forEach(function (t) { t.play(); }); return; }
    var first = !storage('fa-visited');
    storage('fa-visited', '1');

    var tl = gsap.timeline({
      onComplete: function () {
        root.classList.remove('is-loading');
        gsap.set('.pt__panel', { clearProps: 'transform' });
        gsap.set('.pt__brand', { clearProps: 'all' });
      }
    });
    gsap.set('.pt__panel', { scaleY: 1, transformOrigin: 'top' });
    if (first) {
      tl.fromTo('.pt__brand', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' })
        .fromTo('.pt__progress span', { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, '<0.1');
    } else {
      gsap.set('.pt__progress', { autoAlpha: 0 });
    }
    tl.to('.pt__brand', { autoAlpha: 0, y: -18, duration: 0.4, ease: 'power2.in' }, first ? '+=0.05' : 0.1)
      .to('.pt__panel--ink', { scaleY: 0, duration: 0.95, ease: 'expo.inOut' }, '-=0.15')
      .to('.pt__panel--accent', { scaleY: 0, duration: 0.95, ease: 'expo.inOut' }, '<0.09')
      .add(function () { introTimelines.forEach(function (t) { t.play(); }); }, '-=0.6');
  }

  /* ------------------------------------------------------------------
     Revelado al hacer scroll
     ------------------------------------------------------------------ */
  function initReveals() {
    if (!animate) return;

    // Títulos línea por línea
    $$('[data-split]').forEach(function (el) {
      if (el.closest('.hero') || el.closest('.page-hero')) return; // tienen su propia intro
      splitIn(el, { trigger: el, start: 'top 88%' });
    });

    // Elementos que suben con fade
    gsap.set('[data-reveal]', { autoAlpha: 0, y: 36 });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      once: true,
      onEnter: function (els) {
        gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, overwrite: true });
      }
    });

    // Imágenes que se revelan con máscara
    $$('[data-reveal-img]').forEach(function (wrap) {
      var img = wrap.querySelector('img');
      gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top 85%', once: true } })
        .fromTo(wrap, { clipPath: 'inset(18% 10% 18% 10% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.4, ease: 'expo.out', clearProps: 'clipPath' })
        .fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform' }, 0);
    });

    // Parallax
    $$('[data-parallax]').forEach(function (el) {
      var amt = parseFloat(el.getAttribute('data-parallax')) || 10;
      gsap.fromTo(el, { yPercent: -amt }, {
        yPercent: amt, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Video que crece al entrar
    var video = $('.video');
    if (video) {
      gsap.fromTo(video, { scale: 0.9, borderRadius: 48 }, {
        scale: 1, borderRadius: window.innerWidth < 640 ? 18 : 34, ease: 'none',
        scrollTrigger: { trigger: video, start: 'top 95%', end: 'top 35%', scrub: 0.6 }
      });
    }
  }

  function splitIn(el, st, delay) {
    if (!window.SplitText) { gsap.set(el, { visibility: 'visible' }); return null; }
    var split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.set(el, { visibility: 'visible' });
    var vars = {
      yPercent: 110, duration: 1.15, ease: 'expo.out', stagger: 0.09, delay: delay || 0,
      onComplete: function () { split.revert(); }
    };
    if (st) vars.scrollTrigger = { trigger: st.trigger, start: st.start, once: true };
    else vars.paused = true;
    return gsap.from(split.lines, vars);
  }

  /* ------------------------------------------------------------------
     Contadores
     ------------------------------------------------------------------ */
  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      if (!animate) { el.textContent = prefix + end + suffix; return; }
      var obj = { v: 0 };
      el.textContent = prefix + '0' + suffix;
      gsap.to(obj, {
        v: end, duration: 2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () { el.textContent = prefix + Math.round(obj.v) + suffix; }
      });
    });
  }

  /* ------------------------------------------------------------------
     HERO del inicio: slider de mensajes + imágenes
     ------------------------------------------------------------------ */
  function wrapWords(line) {
    function walk(node, grad) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'word';
            var i = document.createElement('span'); i.className = 'word__in' + (grad ? ' is-grad' : '');
            i.textContent = p; w.appendChild(i); frag.appendChild(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child, grad || child.tagName === 'EM');
        }
      });
    }
    walk(line, false);
    return $$('.word__in', line);
  }

  function initHero() {
    var hero = $('.hero');
    if (!hero) return;
    var lines = $$('.hero__line', hero);
    var slides = $$('.hero__slide', hero);
    var bars = $$('.hero__bar', hero);
    var current = $('.hero__current', hero);
    var captions = $$('[data-caption]', hero);
    var total = lines.length;
    var index = 0, busy = false, progress = null, inView = true;
    var DURATION = 6.5;

    function setMeta(i) {
      if (current) current.textContent = String(i + 1).padStart(2, '0');
      bars.forEach(function (b, n) {
        b.classList.toggle('is-active', n === i);
        b.setAttribute('aria-current', n === i ? 'true' : 'false');
      });
      captions.forEach(function (c, n) { c.hidden = n !== i; });
    }

    if (!animate) {
      // Sin animación: rotación simple
      setMeta(0);
      var go0 = function (n) {
        lines[index].style.visibility = 'hidden';
        slides[index].classList.remove('is-active');
        index = (n + total) % total;
        lines[index].style.visibility = 'visible';
        slides[index].classList.add('is-active');
        setMeta(index);
      };
      bars.forEach(function (b, n) { b.addEventListener('click', function () { go0(n); }); });
      var p = $('[data-hero-prev]', hero), nx = $('[data-hero-next]', hero);
      if (p) p.addEventListener('click', function () { go0(index - 1); });
      if (nx) nx.addEventListener('click', function () { go0(index + 1); });
      return;
    }

    var words = lines.map(wrapWords);
    lines.forEach(function (l, i) { gsap.set(l, { autoAlpha: i === 0 ? 1 : 0 }); });
    words.forEach(function (w, i) { if (i) gsap.set(w, { yPercent: 115 }); });
    slides.forEach(function (s, i) {
      s.classList.toggle('is-active', i === 0);
      gsap.set(s, { autoAlpha: i === 0 ? 1 : 0, zIndex: i === 0 ? 1 : 0 });
    });
    setMeta(0);

    function startProgress() {
      if (progress) progress.kill();
      bars.forEach(function (b) { gsap.set(b.querySelector('span'), { scaleX: 0 }); });
      progress = gsap.fromTo(bars[index].querySelector('span'), { scaleX: 0 }, {
        scaleX: 1, duration: DURATION, ease: 'none',
        onComplete: function () { go(index + 1); }
      });
      if (!inView || document.hidden) progress.pause();
    }

    function go(next) {
      next = (next + total) % total;
      if (busy || next === index) return;
      busy = true;
      var prev = index;
      index = next;
      setMeta(index);
      startProgress();

      var tl = gsap.timeline({ onComplete: function () { busy = false; } });
      tl.to(words[prev], { yPercent: -115, duration: 0.55, ease: 'power3.in', stagger: 0.025 })
        .set(lines[prev], { autoAlpha: 0 })
        .set(lines[index], { autoAlpha: 1 })
        .fromTo(words[index], { yPercent: 115 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.045 });

      var inS = slides[index], outS = slides[prev];
      inS.classList.add('is-active');
      gsap.set(inS, { zIndex: 2, autoAlpha: 1 });
      gsap.set(outS, { zIndex: 1 });
      tl.fromTo(inS, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' }, 0.15)
        .fromTo(inS.querySelector('img'), { scale: 1.3, xPercent: 8 }, { scale: 1, xPercent: 0, duration: 1.6, ease: 'expo.out' }, 0.15)
        .to(outS.querySelector('img'), { xPercent: -10, duration: 1.3, ease: 'expo.inOut' }, 0.15)
        .add(function () {
          outS.classList.remove('is-active');
          gsap.set(outS, { autoAlpha: 0, zIndex: 0, clearProps: 'clipPath' });
          gsap.set(outS.querySelector('img'), { xPercent: 0 });
        });
    }

    bars.forEach(function (b, n) { b.addEventListener('click', function () { go(n); }); });
    var prevBtn = $('[data-hero-prev]', hero), nextBtn = $('[data-hero-next]', hero);
    if (prevBtn) prevBtn.addEventListener('click', function () { go(index - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(index + 1); });

    // Swipe en móvil sobre la imagen
    var frame = $('.hero__frame', hero), sx = 0, sy = 0;
    if (frame) {
      frame.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
      frame.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
      }, { passive: true });
    }

    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top',
      onToggle: function (self) { inView = self.isActive; if (progress) inView ? progress.resume() : progress.pause(); }
    });
    document.addEventListener('visibilitychange', function () {
      if (!progress) return;
      document.hidden ? progress.pause() : (inView && progress.resume());
    });

    // Parallax suave de la imagen y salida del contenido
    gsap.to('.hero__media', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__copy', { yPercent: -6, autoAlpha: 0.25, ease: 'none', scrollTrigger: { trigger: hero, start: '30% top', end: 'bottom top', scrub: true } });

    // Intro (se reproduce cuando se abre la cortina)
    var intro = gsap.timeline({ paused: true, onComplete: startProgress });
    intro
      .from('.hero .pill', { autoAlpha: 0, y: 20, duration: 0.9, ease: 'expo.out' })
      .from(words[0], { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: 0.06 }, 0.1)
      .from('.hero__lead, .hero__actions, .hero__controls', { autoAlpha: 0, y: 26, duration: 1, ease: 'expo.out', stagger: 0.09 }, 0.45)
      .fromTo('.hero__frame', { clipPath: 'inset(14% 14% 14% 14% round 30px)' }, { clipPath: 'inset(0% 0% 0% 0% round 30px)', duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath' }, 0)
      .from('.hero__slide.is-active img', { scale: 1.35, duration: 1.9, ease: 'expo.out' }, 0)
      .from('.float-card', { autoAlpha: 0, y: 30, scale: 0.94, duration: 1.1, ease: 'expo.out', stagger: 0.14 }, 0.9)
      .from('.features-strip', { autoAlpha: 0, y: 40, duration: 1.1, ease: 'expo.out' }, 0.75);
    introTimelines.push(intro);
  }

  /* ------------------------------------------------------------------
     Cabecera de páginas internas
     ------------------------------------------------------------------ */
  function initPageHero() {
    var ph = $('.page-hero');
    if (!ph || !animate) return;
    var tl = gsap.timeline({ paused: true });
    tl.from($$('.crumbs, .page-hero .eyebrow', ph), { autoAlpha: 0, y: 16, duration: 0.8, ease: 'expo.out', stagger: 0.08 });
    var title = $('[data-split]', ph);
    if (title) {
      var tw = splitIn(title, null);
      if (tw) { tl.add(function () { tw.play(); }, 0.1); }
    }
    tl.from($$('.page-hero__lead, .page-hero__meta', ph), { autoAlpha: 0, y: 24, duration: 1, ease: 'expo.out', stagger: 0.1 }, 0.4)
      .from('.page-hero__bg', { scale: 1.12, autoAlpha: 0, duration: 1.8, ease: 'expo.out' }, 0);
    introTimelines.push(tl);
    gsap.to('.page-hero .container', { yPercent: 18, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ------------------------------------------------------------------
     Citas (slider con fade)
     ------------------------------------------------------------------ */
  function initQuotes() {
    var wrap = $('[data-quotes]');
    if (!wrap) return;
    var items = $$('.quote', wrap);
    var dots = $$('.quotes__dot');
    var i = 0, prog = null, inView = false;
    var D = 8;

    function show(n, instant) {
      var prev = i;
      i = (n + items.length) % items.length;
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); gsap.set(d.querySelector('span'), { scaleX: 0 }); });
      if (animate && !instant && prev !== i) {
        gsap.to(items[prev], { autoAlpha: 0, y: -20, duration: 0.5, ease: 'power2.in' });
        gsap.fromTo(items[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: 0.35 });
      } else {
        items.forEach(function (q, k) { q.style.visibility = k === i ? 'visible' : 'hidden'; q.style.opacity = k === i ? 1 : 0; });
      }
      if (!animate) return;
      if (prog) prog.kill();
      prog = gsap.fromTo(dots[i].querySelector('span'), { scaleX: 0 }, { scaleX: 1, duration: D, ease: 'none', onComplete: function () { show(i + 1); } });
      if (!inView) prog.pause();
    }
    dots.forEach(function (d, k) { d.addEventListener('click', function () { if (k !== i) show(k); }); });
    var pv = $('[data-quotes-prev]'), nx = $('[data-quotes-next]');
    if (pv) pv.addEventListener('click', function () { show(i - 1); });
    if (nx) nx.addEventListener('click', function () { show(i + 1); });
    show(0, true);
    if (animate) {
      ScrollTrigger.create({
        trigger: wrap, start: 'top 85%', end: 'bottom top',
        onToggle: function (s) { inView = s.isActive; if (prog) inView ? prog.resume() : prog.pause(); }
      });
    }
  }

  /* ------------------------------------------------------------------
     Video (YouTube con portada personalizada)
     ------------------------------------------------------------------ */
  function initVideo() {
    var box = $('[data-video]');
    if (!box) return;
    var id = box.getAttribute('data-video');
    var player = null, apiPromise = null;

    function loadAPI() {
      if (window.YT && window.YT.Player) return Promise.resolve();
      if (apiPromise) return apiPromise;
      apiPromise = new Promise(function (resolve) {
        var prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () { if (prev) prev(); resolve(); };
        var s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      });
      return apiPromise;
    }

    function play() {
      box.classList.add('is-busy');
      box.classList.remove('is-ended');
      if (player && player.playVideo) {
        player.playVideo();
        box.classList.add('is-playing');
        box.classList.remove('is-busy');
        return;
      }
      loadAPI().then(function () {
        player = new YT.Player(box.querySelector('.video__player'), {
          videoId: id,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1, controls: 1 },
          events: {
            onReady: function (e) {
              box.classList.add('is-playing');
              box.classList.remove('is-busy');
              e.target.playVideo();
            },
            onStateChange: function (e) {
              if (e.data === YT.PlayerState.ENDED) {
                box.classList.add('is-ended');
                player.seekTo(0);
                player.pauseVideo();
              }
            }
          }
        });
      });
    }

    $$('[data-video-play]', box).forEach(function (b) { b.addEventListener('click', play); });

    // Precarga de la API cuando el video se acerca
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { loadAPI(); io.disconnect(); }
      }, { rootMargin: '400px' });
      io.observe(box);
    }
  }

  /* ------------------------------------------------------------------
     Panel ilustrativo de reportes en tiempo real
     ------------------------------------------------------------------ */
  function initDash() {
    var dash = $('[data-dash]');
    if (!dash) return;
    var valEl = $('[data-dash-value]', dash);
    var ring = $('.dash__ring .fg', dash);
    var ringTxt = $('[data-dash-pct]', dash);
    var gates = $$('[data-gate]', dash);
    var capacity = 5200;
    var count = parseInt(valEl.getAttribute('data-start'), 10) || 3480;
    var timer = null;

    function fmt(n) { return n.toLocaleString('es-DO'); }
    function render() {
      var pct = Math.min(99, Math.round((count / capacity) * 100));
      valEl.textContent = fmt(count);
      if (ring) ring.style.strokeDashoffset = String(201 - (201 * pct) / 100);
      if (ringTxt) ringTxt.textContent = pct + '%';
    }
    function tick() {
      var add = 3 + Math.floor(Math.random() * 12);
      count += add;
      if (count > capacity * 0.97) count = Math.round(capacity * 0.55);
      var g = gates[Math.floor(Math.random() * gates.length)];
      if (g) {
        var b = $('b', g), bar = $('.gate__bar span', g);
        var gv = parseInt(b.getAttribute('data-v'), 10) + add;
        b.setAttribute('data-v', gv);
        b.textContent = fmt(gv);
        bar.style.width = Math.min(100, (gv / 2200) * 100) + '%';
      }
      if (animate) {
        var o = { v: count - add };
        gsap.to(o, { v: count, duration: 0.8, ease: 'power2.out', onUpdate: function () { valEl.textContent = fmt(Math.round(o.v)); } });
        var pct = Math.min(99, Math.round((count / capacity) * 100));
        if (ring) ring.style.strokeDashoffset = String(201 - (201 * pct) / 100);
        if (ringTxt) ringTxt.textContent = pct + '%';
      } else render();
    }
    render();
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { if (!timer) timer = setInterval(tick, 2200); }
      else { clearInterval(timer); timer = null; }
    }).observe(dash);
  }

  /* ------------------------------------------------------------------
     Efectos de cursor (escritorio)
     ------------------------------------------------------------------ */
  function initPointerFx() {
    if (!finePointer || reduceMotion) return;
    $$('[data-spotlight]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    if (!hasGSAP) return;
    $$('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  /* ------------------------------------------------------------------
     Página Eventos: buscador + "ver más"
     ------------------------------------------------------------------ */
  function initEvents() {
    var grid = $('[data-events-grid]');
    if (!grid) return;
    var cards = $$('.event-card', grid);
    var input = $('[data-events-search]');
    var moreWrap = $('[data-events-more]');
    var moreBtn = moreWrap ? $('button', moreWrap) : null;
    var countEl = $('[data-events-count]');
    var empty = $('[data-events-empty]');
    var STEP = 12;
    var limit = 16;

    function norm(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

    function render(animateNew) {
      var q = norm(input ? input.value.trim() : '');
      var matched = 0, fresh = [];
      cards.forEach(function (c) {
        var ok = !q || norm(c.getAttribute('data-title')).indexOf(q) !== -1;
        if (ok) matched++;
        var show = ok && (q || matched <= limit);
        if (show && c.hidden) fresh.push(c);
        c.hidden = !show;
      });
      if (countEl) countEl.textContent = matched;
      if (moreWrap) moreWrap.hidden = !!q || matched <= limit;
      if (empty) empty.hidden = matched > 0;
      if (animate && animateNew && fresh.length) {
        gsap.fromTo(fresh, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.04, clearProps: 'transform' });
      }
      if (hasGSAP) ScrollTrigger.refresh();
    }

    if (input) {
      var t;
      input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { render(true); }, 120); });
    }
    if (moreBtn) moreBtn.addEventListener('click', function () { limit += STEP; render(true); });

    render(false);
    if (animate) {
      gsap.set(cards, { autoAlpha: 0, y: 40 });
      ScrollTrigger.batch(cards, {
        start: 'top 92%', once: true,
        onEnter: function (els) { gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.06, clearProps: 'transform' }); }
      });
    }
  }

  /* ------------------------------------------------------------------
     Formularios
     ------------------------------------------------------------------ */
  function buildMailto(type, data) {
    var subject, lines = [];
    if (type === 'newsletter') {
      subject = 'Suscripción para más información';
      lines.push('Hola, me gustaría recibir más información sobre Forward Access.', '', 'Correo: ' + data.get('email'));
    } else {
      subject = 'Solicitud de cotización — ' + (data.get('evento') || 'Evento');
      var servicios = data.getAll('servicios');
      lines.push(
        'Nombre: ' + (data.get('nombre') || ''),
        'E-mail: ' + (data.get('email') || ''),
        'Teléfono: ' + (data.get('telefono') || '—'),
        'Nombre del evento: ' + (data.get('evento') || ''),
        'Fecha: ' + (data.get('fecha') || ''),
        'Asistentes estimados: ' + (data.get('asistentes') || '—'),
        'Lugar: ' + (data.get('lugar') || '—'),
        'Servicios de interés: ' + (servicios.length ? servicios.join(', ') : '—'),
        '',
        'Mensaje:',
        data.get('mensaje') || ''
      );
    }
    return 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function initForms() {
    $$('form[data-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var data = new FormData(form);
        if (data.get('_gotcha')) return; // anti-spam
        var type = form.getAttribute('data-form');
        var btn = $('[type="submit"]', form);
        var okMsg = type === 'newsletter'
          ? '¡Gracias! Te mantendremos informado.'
          : '¡Gracias! Recibimos tu solicitud y te contactaremos pronto.';

        if (!CONFIG.formEndpoint) {
          window.location.href = buildMailto(type, data);
          toast('Abrimos tu correo con el mensaje listo. Solo tienes que enviarlo.');
          return;
        }
        if (btn) { btn.classList.add('is-loading'); btn.disabled = true; }
        data.append('_subject', type === 'newsletter' ? 'Nueva suscripción — forward.do' : 'Nueva cotización — forward.do');
        fetch(CONFIG.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error(r.status); toast(okMsg); form.reset(); })
          .catch(function () { toast('No pudimos enviar el formulario. Escríbenos a ' + CONFIG.email, 'error'); })
          .then(function () { if (btn) { btn.classList.remove('is-loading'); btn.disabled = false; } });
      });
    });

    // La fecha mínima del evento es hoy
    $$('input[type="date"][data-min-today]').forEach(function (d) {
      var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
      d.min = t.toISOString().slice(0, 10);
    });
  }

  /* ------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------ */
  function boot() {
    initHero();
    initPageHero();
    initCounters();
    initQuotes();
    initVideo();
    initDash();
    initPointerFx();
    initEvents();
    initForms();
    initReveals();
    playEnter();
    if (hasGSAP) {
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    }
  }

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var started = false;
  function start() { if (started) return; started = true; boot(); }
  fontsReady.then(start);
  setTimeout(start, 1500); // por si las fuentes tardan demasiado
})();
