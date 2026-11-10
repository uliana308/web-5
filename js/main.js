/* =========================================================
   Naked City Films — учебная копия. Вся анимация на чистом JS.
   Модули:
   1. Плавный скролл (lerp + transform)
   2. Интро: шторки + видео на фоне
   3. Карточка-навигация, которая при скролле раскрывается на весь экран,
      а логотип NKD CITY превращается в маленький NKD▬ в шапке
   4. Построчное появление текста + «рисующаяся» синяя подсветка
   5. Фильмы: проявление, видео при наведении, наклон от скорости скролла, плеер
   6. Горизонтальный слайдер статей с перетаскиванием и инерцией
   7. Футер: картинки внутри логотипа за курсором
   8. Выпадающий список Talents, курсор, скринсейвер
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const content = $('#scrollableContent');
  const navBar = $('#navBar');
  const nav = $('#NCNav');
  const navBg = $('#navBg');
  const logoLink = $('#NCNavLogo');
  const logoSvg = $('#NCLogoSVGViewBox');
  const cityText = $('#NCLogoCityText');
  const cityOverlay = $('#NCLogoCityOverlay');
  const cityOverlayWhite = $('#NCLogoCityOverlayWhite');
  const scrollLine = $('#NCNavScrollLine');
  const sideL = $('#navSideLeft');
  const sideR = $('#navSideRight');
  const welcome = $('#welcome');
  const spacer = $('#homeNavAniSpacing');

  let vw = innerWidth, vh = innerHeight;
  let target = 0, current = 0, velocity = 0;
  let introDone = false;
  let footerParallax = () => {};

  if (cityOverlayWhite) cityOverlayWhite.style.display = 'none';
  navBar.classList.add('is-js');

  /* ---------------- 1. ПЛАВНЫЙ СКРОЛЛ ---------------- */
  function setBodyHeight() {
    document.body.style.height = content.getBoundingClientRect().height + 'px';
  }
  new ResizeObserver(setBodyHeight).observe(content);

  addEventListener('scroll', () => { target = scrollY; }, { passive: true });

  // Якорные ссылки (#studio, #footer)
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    e.preventDefault();
    if (id === '#') { if (a.closest('#NCNavLogo, #footer')) scrollTo({ top: 0 }); return; }
    const el = $(id);
    if (el) scrollTo({ top: el.getBoundingClientRect().top + current });
  }));

  /* ---------------- 3. НАВИГАЦИЯ-КАРТОЧКА ---------------- */
  function startRect() {
    let w = vw > 769 ? Math.max(754, vw * .5) : vw * (vw > 551 ? .8 : .9);
    w = Math.min(w, vw);
    const h = Math.min(vh, vw > 551 ? Math.max(460, vh * .7) : 450);
    return { x: (vw - w) / 2, y: vh / 2 - 15 - h / 2, w, h };
  }

  let lastP = -1, lastW = -1;
  function updateNav() {
    const dist = spacer.offsetHeight || vh * .8;
    const p = clamp(current / dist);
    if (Math.abs(p - lastP) < 0.0005 && vw === lastW) return;
    lastP = p; lastW = vw;
    const e = easeInOut(p);
    const s = startRect();

    // Размер и положение карточки
    const x = lerp(s.x, 0, e), y = lerp(s.y, 0, e);
    const w = lerp(s.w, vw, e), h = lerp(s.h, vh, e);
    Object.assign(navBar.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });

    // Логотип: CITY-блок сжимается в маленькую плашку
    const vb = lerp(690, 492, e);
    const rx = lerp(690, 492, e), by = lerp(142, 53, e);
    logoSvg.setAttribute('viewBox', `0 0 ${vb} 142`);
    const fade = clamp(p / .35);
    cityText.style.opacity = 1 - fade;
    cityOverlay.setAttribute('d', `M 404 0 H ${rx} V ${by} H 404 Z`);
    cityOverlay.style.opacity = fade;

    const finalW = vw > 769 ? 190 : 120;
    const lw = lerp(w - 80, finalW, e);
    const lh = lw * 142 / vb;
    const marquee = 30;
    const lx = lerp(40, (w - lw) / 2, e);
    const ly = lerp(h - marquee - 40 - lh, vw > 769 ? 22 : 60, e);
    Object.assign(logoLink.style, { left: lx + 'px', top: ly + 'px', bottom: 'auto', width: lw + 'px' });

    // Пункты меню прижимаются к краям
    const sw = lerp(50, vw > 769 ? 20 : 50, e) + '%';
    sideL.style.width = sw; sideR.style.width = sw;

    scrollLine.style.opacity = 1 - clamp(p * 3);

    // Когда карточка раскрылась — убираем видео и фон, шапка становится прозрачной
    const open = p >= .999;
    navBg.style.opacity = open ? 0 : 1;
    welcome.classList.toggle('is-hidden', open);
    navBar.classList.toggle('is-open', open);
  }

  // Цвет шапки по секции под ней
  const themed = $$('[data-theme]');
  function updateTheme() {
    let dark = false;
    if (navBar.classList.contains('is-open')) {
      const probe = 45;
      for (const el of themed) {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom >= probe) dark = el.dataset.theme === 'dark';
      }
    }
    navBar.classList.toggle('theme-dark', dark);
  }

  /* ---------------- 4. ПОСТРОЧНЫЙ ТЕКСТ ---------------- */
  const splits = $$('.nc-split');
  splits.forEach(p => { p.dataset.src = p.innerHTML; });

  function splitText(p) {
    p.innerHTML = p.dataset.src;
    // Собираем слова: {text, hl, br}
    const words = [];
    p.childNodes.forEach(node => {
      if (node.nodeType === 3) {
        node.textContent.split(/\s+/).filter(Boolean).forEach(t => words.push({ t, hl: false }));
      } else if (node.nodeName === 'BR') {
        words.push({ br: true });
      } else {
        node.textContent.split(/\s+/).filter(Boolean).forEach(t => words.push({ t, hl: true }));
      }
    });
    // Меряем, какие слова попадают в какую строку
    p.innerHTML = '';
    const spans = [];
    words.forEach(w => {
      if (w.br) { p.appendChild(document.createElement('br')); spans.push(null); return; }
      const s = document.createElement('span');
      s.textContent = w.t + ' ';
      if (w.hl) s.style.padding = '0 5px';
      p.appendChild(s); spans.push(s);
    });
    const lines = [];
    let top = null, line = null;
    words.forEach((w, i) => {
      if (w.br) { top = null; return; }
      const t = spans[i].offsetTop;
      if (top === null || Math.abs(t - top) > 4) { line = []; lines.push(line); top = t; }
      line.push(w);
    });
    // Собираем строки
    p.innerHTML = '';
    lines.forEach((ln, li) => {
      const L = document.createElement('span');
      L.className = 'nc-text-line';
      L.style.transitionDelay = (li * .09) + 's';
      let i = 0;
      while (i < ln.length) {
        if (ln[i].hl) {
          const parts = [];
          while (i < ln.length && ln[i].hl) parts.push(ln[i++].t);
          const H = document.createElement('span');
          H.className = 'nc-highlight';
          // сначала растёт серая плашка, поверх неё — синяя, и вместе с синей «проявляется» текст
          H.innerHTML = `<span class="nc-high-grey"></span><span class="nc-high-blue"></span><span class="nc-text-ani">${parts.join(' ')}</span>`;
          const d = .3 + li * .09;
          H.children[0].style.transitionDelay = d + 's';
          H.children[1].style.transitionDelay = (d + .55) + 's';
          H.children[2].style.transitionDelay = (d + .6) + 's';
          L.appendChild(H);
          if (i < ln.length) L.appendChild(document.createTextNode(' '));
        } else {
          const parts = [];
          while (i < ln.length && !ln[i].hl) parts.push(ln[i++].t);
          L.appendChild(document.createTextNode(parts.join(' ') + (i < ln.length ? ' ' : '')));
        }
      }
      p.appendChild(L);
    });
    p.classList.add('is-ready');
  }
  function splitAll() { splits.forEach(splitText); }

  /* ---------------- Появление элементов в зоне видимости ---------------- */
  const revealEls = () => [...splits, ...$$('.nc-articles-thumbnail')];
  let pending = [];
  function checkInView() {
    if (!introDone || !navBar.classList.contains('is-open')) return;
    pending = pending.filter(el => {
      const r = el.getBoundingClientRect();
      const inView = r.top < vh * .92 && r.bottom > 0 && r.left < vw;
      if (inView) el.classList.add('is-inview');
      return !inView;
    });
  }

  /* ---------------- 5. ФИЛЬМЫ ---------------- */
  /* Наведение на фильм, как в оригинале:
     по картинке проходит синяя шторка (растёт слева и уезжает вправо),
     одновременно картинка «рассыпается» пиксельным шумом,
     а в середине перехода картинка меняется на видео. При уходе курсора всё повторяется в обратную сторону.
     Шум рисуется на canvas: кадр источника в низком разрешении + случайные пиксели и сдвинутые полосы. */
  const NOISE_COLORS = [[0, 4, 235], [0, 4, 235], [230, 230, 230], [5, 5, 22], [151, 151, 151]];
  const TRANSITION = 750;

  function makeNoiseFrame(nctx, w, h, amount) {
    const data = nctx.createImageData(w, h);
    const d = data.data;
    for (let i = 0; i < w * h; i++) {
      if (Math.random() < amount) {
        const c = NOISE_COLORS[(Math.random() * NOISE_COLORS.length) | 0];
        d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2];
        d[i * 4 + 3] = 140 + Math.random() * 115;
      }
    }
    nctx.putImageData(data, 0, 0);
  }

  const films = $$('.film-block');
  films.forEach(f => {
    const wrap = $('.film-bg-wrapper', f);
    const img = $('.nc-thumb-image', f);
    const video = $('video', f);
    const curtain = document.createElement('span');
    curtain.className = 'film-curtain';
    const canvas = document.createElement('canvas');
    canvas.className = 'film-noise';
    wrap.append(canvas, curtain);
    const ctx = canvas.getContext('2d');
    const noise = document.createElement('canvas');
    const nctx = noise.getContext('2d');

    let showVideo = false, raf = 0, start = 0, swapped = false, curtainAnim;

    function run(toVideo) {
      showVideo = toVideo;
      if (toVideo) video.play().catch(() => {});
      // размер канваса = 1/5 от картинки, растягивается с pixelated
      const r = wrap.getBoundingClientRect();
      const w = Math.max(20, Math.round(r.width / 5)), h = Math.max(12, Math.round(r.height / 5));
      canvas.width = noise.width = w; canvas.height = noise.height = h;

      if (curtainAnim) curtainAnim.cancel();
      curtainAnim = curtain.animate([
        { left: '0%', width: '0%' },
        { left: '0%', width: '100%', offset: .45 },
        { left: '100%', width: '0%' }
      ], { duration: TRANSITION, easing: 'cubic-bezier(.65,0,.35,1)' });

      start = performance.now(); swapped = false;
      cancelAnimationFrame(raf);
      const step = now => {
        const t = clamp((now - start) / TRANSITION);
        if (!swapped && t >= .45) { swapped = true; wrap.classList.toggle('show-video', showVideo); }
        const src = wrap.classList.contains('show-video') && video.readyState >= 2 ? video : img;
        const amount = Math.sin(Math.PI * t) * .55;
        ctx.clearRect(0, 0, w, h);
        try {
          ctx.drawImage(src, 0, 0, w, h);
          // несколько сдвинутых горизонтальных полос — «глитч»
          for (let k = 0; k < 4; k++) {
            if (Math.random() > amount * 1.6) continue;
            const y = (Math.random() * h) | 0, sh = 1 + (Math.random() * 3) | 0, dx = (Math.random() - .5) * w * .3;
            ctx.drawImage(src, 0, y / h * (src.videoHeight || src.naturalHeight), (src.videoWidth || src.naturalWidth), sh / h * (src.videoHeight || src.naturalHeight), dx, y, w, sh);
          }
        } catch (e) { /* источник ещё не готов */ }
        makeNoiseFrame(nctx, w, h, amount);
        ctx.drawImage(noise, 0, 0);
        canvas.style.opacity = t < 1 ? 1 : 0;
        if (t < 1) raf = requestAnimationFrame(step);
        else if (!showVideo) video.pause();
      };
      raf = requestAnimationFrame(step);
    }

    f.addEventListener('mouseenter', () => run(true));
    f.addEventListener('mouseleave', () => run(false));
    f.addEventListener('click', e => { e.preventDefault(); player.open(f.dataset); });
  });
  function updateFilms() {}

  // Плеер
  const player = (() => {
    const el = $('#player'), video = $('#playerVideo'), fill = $('#playerFill'), bar = $('#playerProgress');
    function open(d) {
      video.src = d.video;
      $('#playerClient').innerHTML = d.client;
      $('#playerTitle').innerHTML = d.title;
      el.classList.add('is-open');
      cursor.hide();
      video.currentTime = 0; video.play().catch(() => {});
    }
    function close() { el.classList.remove('is-open'); video.pause(); }
    video.addEventListener('timeupdate', () => { fill.style.width = (video.currentTime / video.duration * 100 || 0) + '%'; });
    bar.addEventListener('click', e => {
      const r = bar.getBoundingClientRect();
      video.currentTime = (e.clientX - r.left) / r.width * video.duration;
    });
    $('#playerClose').addEventListener('click', close);
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    return { open };
  })();

  /* ---------------- 6. СЛАЙДЕР СТАТЕЙ ---------------- */
  (() => {
    const s = $('#articlesSlider');
    let down = false, startX = 0, startL = 0, lastX = 0, v = 0, moved = false, raf;
    s.addEventListener('pointerdown', e => {
      down = true; moved = false; startX = lastX = e.clientX; startL = s.scrollLeft; v = 0;
      cancelAnimationFrame(raf);
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; s.classList.add('articles-dragging'); }
      v = e.clientX - lastX; lastX = e.clientX;
      s.scrollLeft = startL - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      s.classList.remove('articles-dragging');
      const glide = () => { v *= .94; s.scrollLeft -= v; if (Math.abs(v) > .4) raf = requestAnimationFrame(glide); };
      glide();
    });
    s.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);
    // курсор-подсказка «← →», как на оригинале
    s.addEventListener('mouseenter', () => cursor.show('←→'));
    s.addEventListener('mouseleave', () => cursor.hide());
    s.addEventListener('scroll', checkInViewAll, { passive: true });
  })();
  function checkInViewAll() { checkInView(); }

  /* ---------------- 7. ФУТЕР: картинки в логотипе ---------------- */
  (() => {
    const svg = $('#NCFooterLogo');
    if (!svg) return;
    const trail = $('#footerTrail');
    const NS = 'http://www.w3.org/2000/svg';
    /* Как в оригинале: за курсором по высоте логотипа «отпечатываются» узкие вертикальные
       полосы-картинки, вплотную друг к другу. Свежая полоса яркая, старые тают,
       и сквозь них проступает синий фон — получается синеватый хвост.
       Логотип служит маской (clipPath), поэтому вырезы букв CITY остаются тёмными. */
    const STRIP = 58;          // ширина полосы в единицах viewBox (1520 = вся ширина логотипа)
    const LIFE = 1500;         // сколько живёт полоса, мс
    let idx = 0, lastX = null;
    function stamp(x) {
      const img = document.createElementNS(NS, 'image');
      img.setAttribute('href', `media/images/footer/${idx++ % 16}.jpg`);
      img.setAttribute('width', STRIP); img.setAttribute('height', 143);
      img.setAttribute('x', x - STRIP / 2); img.setAttribute('y', 0);
      img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      trail.appendChild(img);
      img.animate([
        { opacity: 1, filter: 'saturate(1)' },
        { opacity: .85, filter: 'saturate(.9)', offset: .25 },
        { opacity: 0, filter: 'saturate(.4)' }
      ], { duration: LIFE, easing: 'linear', fill: 'forwards' }).onfinish = () => img.remove();
    }
    svg.addEventListener('mousemove', e => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const x = pt.matrixTransform(svg.getScreenCTM().inverse()).x;
      if (lastX === null) { stamp(x); lastX = x; return; }
      const dist = x - lastX;
      const n = Math.floor(Math.abs(dist) / STRIP);
      // заполняем промежуток, чтобы при быстром движении не было дыр
      for (let i = 1; i <= n; i++) stamp(lastX + Math.sign(dist) * STRIP * i);
      if (n) lastX += Math.sign(dist) * STRIP * n;
    });
    svg.addEventListener('mouseleave', () => { lastX = null; });

    // Тёмная часть футера «выезжает» из-под серого блока (параллакс)
    const wrap = $('.footer-ani-wrapper');
    const inner = document.createElement('div');
    inner.className = 'footer-ani';
    while (wrap.firstChild) inner.appendChild(wrap.firstChild);
    wrap.appendChild(inner);
    footerParallax = () => {
      const r = wrap.getBoundingClientRect();
      const p = clamp((vh - r.top) / r.height);
      inner.style.transform = `translate3d(0, ${(-(1 - p) * r.height * .45).toFixed(1)}px, 0)`;
    };
  })();

  /* ---------------- 8. TALENTS ---------------- */
  (() => {
    const btn = $('#talentsBtn'), list = $('#talentList'), item = btn.parentElement;
    const slides = $$('.director-slide');
    let t;
    const open = () => {
      clearTimeout(t);
      list.classList.add('show'); navBar.classList.add('nav-talents-open');
      $$('.talent-type-title, .director-link', list).forEach((el, i) => { el.style.transitionDelay = (i * .03) + 's'; });
    };
    const close = () => {
      t = setTimeout(() => {
        list.classList.remove('show'); navBar.classList.remove('nav-talents-open');
        slides.forEach(s => s.classList.remove('active'));
        $$('.talent-type-title, .director-link', list).forEach(el => { el.style.transitionDelay = '0s'; });
      }, 200);
    };
    item.addEventListener('mouseenter', open);
    item.addEventListener('mouseleave', close);
    btn.addEventListener('click', () => (list.classList.contains('show') ? close() : open()));
    $$('.director-link', list).forEach(a => {
      a.addEventListener('mouseenter', () => slides.forEach(s => s.classList.toggle('active', s.dataset.slide === a.dataset.slide)));
      a.addEventListener('click', e => e.preventDefault());
    });
  })();

  /* ---------------- Курсор ---------------- */
  const cursor = (() => {
    const el = $('#uniqueCursor');
    let mx = -100, my = -100, cx = -100, cy = -100;
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    function tick() { cx = lerp(cx, mx, .35); cy = lerp(cy, my, .35); el.style.left = cx + 'px'; el.style.top = cy + 'px'; }
    return {
      tick,
      show(txt) { el.textContent = txt; el.classList.add('is-visible'); },
      hide() { el.classList.remove('is-visible'); }
    };
  })();

  /* ---------------- Скринсейвер ---------------- */
  (() => {
    const ss = $('#NCScreenSaver'), holder = $('#NCLogoScreenSaver');
    holder.innerHTML = logoSvg.outerHTML.replace('id="NCLogoSVGViewBox"', '').replace(/#0004eb/gi, '#ffffff')
      .replace(/id="NCLogo[^"]*"/g, '');
    const s = holder.firstElementChild;
    s.setAttribute('viewBox', '0 0 690 142');
    $$('path', s).slice(3).forEach(p => p.remove());
    s.querySelector('path:nth-child(3)').style.opacity = 1;
    let idle, active = false, x = 50, y = 50, dx = 2.2, dy = 1.8, raf;
    const IDLE = 40000;
    function loop() {
      const w = holder.offsetWidth, h = holder.offsetHeight;
      x += dx; y += dy;
      if (x <= 0 || x + w >= vw) dx *= -1;
      if (y <= 0 || y + h >= vh) dy *= -1;
      holder.style.transform = `translate(${x}px, ${y}px)`;
      raf = requestAnimationFrame(loop);
    }
    function wake() {
      if (active) { active = false; ss.classList.remove('is-active'); cancelAnimationFrame(raf); }
      clearTimeout(idle); idle = setTimeout(() => { active = true; ss.classList.add('is-active'); loop(); }, IDLE);
    }
    ['mousemove', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(ev => addEventListener(ev, wake, { passive: true }));
    wake();
  })();

  /* ---------------- 2. ИНТРО ---------------- */
  function intro() {
    const curtain = $('#welcomeCurtain'), init = $('#NCNavInitCurtain');
    const ease = 'cubic-bezier(.77,0,.18,1)';
    if (reduced) { curtain.remove(); nav.style.opacity = 1; finish(); return; }
    curtain.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
      { duration: 1100, delay: 200, easing: ease, fill: 'forwards' });
    init.animate([{ width: '0%', left: '0%' }, { width: '100%', left: '0%' }],
      { duration: 700, delay: 750, easing: ease, fill: 'forwards' }).onfinish = () => {
      nav.style.opacity = 1;
      // логотип и пункты меню проявляются снизу
      logoLink.animate([{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 1000, easing: 'cubic-bezier(.19,1,.22,1)' });
      $$('.navigation-items-side > .navigation-item').forEach((n, i) =>
        n.animate([{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 800, delay: 150 + i * 80, easing: 'cubic-bezier(.19,1,.22,1)', fill: 'backwards' }));
      init.animate([{ width: '100%', left: '0%' }, { width: '0%', left: '100%' }],
        { duration: 700, easing: ease, fill: 'forwards' }).onfinish = () => { curtain.remove(); finish(); };
    };
  }
  function finish() {
    introDone = true;
    document.body.classList.remove('is-loading');
  }

  /* ---------------- RAF ---------------- */
  function frame() {
    const prev = current;
    current = reduced ? target : lerp(current, target, .085);
    if (Math.abs(target - current) < .05) current = target;
    velocity = current - prev;
    content.style.transform = `translate3d(0, ${-current}px, 0)`;
    updateNav();
    updateTheme();
    footerParallax();
    checkInView();
    cursor.tick();
    requestAnimationFrame(frame);
  }

  let rt;
  addEventListener('resize', () => {
    vw = innerWidth; vh = innerHeight; lastP = -1;
    clearTimeout(rt);
    rt = setTimeout(() => {
      splits.forEach(p => { const was = p.classList.contains('is-inview'); splitText(p); if (was) p.classList.add('is-inview'); });
      setBodyHeight();
    }, 200);
  });

  // Старт
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  const start = () => {
    splitAll();
    pending = revealEls();
    setBodyHeight();
    requestAnimationFrame(frame);
    intro();
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
})();
