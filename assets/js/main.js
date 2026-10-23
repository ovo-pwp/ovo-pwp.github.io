/* ==========================================================================
   ovo-pwp · 个人作品集 · 交互脚本
   1) 主题切换  2) 滚动显现  3) 导航高亮  4) 移动菜单  5) 作品筛选  6) 页脚年份
   7) 阅读进度与背景视差  8) 统计数字滚动  9) 指针交互  10) 封面大图预览
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 主题切换 ---------- */
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---------- 2. 滚动显现 ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    // 同组元素依次错开出现
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (i % 6) * 55 + 'ms';
      revealObserver.observe(el);
    });
  }

  /* ---------- 3. 导航高亮 + 顶栏状态 ---------- */
  var header = document.getElementById('siteHeader');
  var readProgress = document.getElementById('readProgress');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;

    if (header) header.classList.toggle('is-scrolled', y > 8);

    // 阅读进度条：0 → 1
    if (readProgress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
      readProgress.style.setProperty('--p', p.toFixed(4));
    }

    // 背景光斑的轻微视差，制造层次感
    if (!prefersReduced) {
      root.style.setProperty('--scrollShift', (-Math.min(y, 900) * 0.05).toFixed(2) + 'px');
    }

    if (!sections.length) return;

    var current = null;
    var offset = 120;
    sections.forEach(function (sec) {
      if (sec.getBoundingClientRect().top - offset <= 0) current = sec;
    });

    // 页面触底时选中最后一个区块
    if (window.innerHeight + y >= document.body.offsetHeight - 4) {
      current = sections[sections.length - 1];
    }

    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', !!current && a.getAttribute('href') === '#' + current.id);
    });
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  /* ---------- 4. 移动端菜单 ---------- */
  var menuBtn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');

  function closeMenu() {
    if (!nav || !menuBtn) return;
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', '打开菜单');
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var willOpen = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', willOpen);
      menuBtn.setAttribute('aria-expanded', String(willOpen));
      menuBtn.setAttribute('aria-label', willOpen ? '关闭菜单' : '打开菜单');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || menuBtn.contains(e.target)) return;
      closeMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 720) closeMenu();
    });
  }

  /* ---------- 5. 作品分类筛选（按钮按项目实际的 data-cat 生成） ---------- */
  var filterBar = document.getElementById('filters');
  var projectList = Array.prototype.slice.call(document.querySelectorAll('.project'));
  var emptyHint = document.getElementById('emptyHint');

  if (filterBar && projectList.length) {
    // data-cat 用英文键，按钮显示中文
    var CAT_LABELS = { fullstack: '全栈应用', web: '网页作品', data: '数据分析' };

    // 按出现顺序收集分类并去重
    var cats = [];
    projectList.forEach(function (card) {
      var cat = card.dataset.cat;
      if (cat && cats.indexOf(cat) === -1) cats.push(cat);
    });

    // 只有一个分类时筛选没有意义，保持隐藏
    if (cats.length > 1) {
      var makeBtn = function (label, value, active) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'filter' + (active ? ' is-active' : '');
        b.dataset.filter = value;
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(!!active));
        b.textContent = label;
        return b;
      };

      filterBar.appendChild(makeBtn('全部', 'all', true));
      cats.forEach(function (c) { filterBar.appendChild(makeBtn(CAT_LABELS[c] || c, c, false)); });
      filterBar.hidden = false;

      var filterBtns = Array.prototype.slice.call(filterBar.querySelectorAll('.filter'));

      filterBar.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.filter') : null;
        if (!btn) return;
        var cat = btn.dataset.filter;

        filterBtns.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });

        var shown = 0;
        projectList.forEach(function (card) {
          var match = cat === 'all' || card.dataset.cat === cat;
          card.classList.toggle('is-hidden', !match);
          if (match) shown++;
        });

        if (emptyHint) emptyHint.hidden = shown !== 0;
      });
    }
  }

  /* ---------- 6. 页脚年份 ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 7. 统计数字滚动计数 ---------- */
  var statNums = Array.prototype.slice.call(document.querySelectorAll('.stats strong'));

  function countUp(el) {
    var target = parseInt(el.textContent.replace(/[^\d]/g, ''), 10);
    if (isNaN(target) || target <= 0) return;

    var duration = 950;
    var startTime = null;

    function step(now) {
      if (startTime === null) startTime = now;
      var t = Math.min((now - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = String(Math.round(target * eased));
      if (t < 1) window.requestAnimationFrame(step);
      else el.textContent = String(target); // 收尾落在精确值上
    }

    el.textContent = '0';
    window.requestAnimationFrame(step);
  }

  if (statNums.length && !prefersReduced && 'IntersectionObserver' in window) {
    var statObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        statObserver.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    statNums.forEach(function (el) { statObserver.observe(el); });
  }

  /* ---------- 8. 指针交互（光标光晕 / 卡片倾斜 / 磁性按钮） ---------- */
  // 只在有精确指针的设备上启用，触屏与减少动效偏好下全部跳过
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (finePointer && !prefersReduced) {
    /* 8.1 光标柔光晕：平滑追随；指针停 500ms 后就停掉 rAF，不空转 */
    var glow = document.getElementById('cursorGlow');
    if (glow) {
      var tX = window.innerWidth / 2;
      var tY = window.innerHeight / 2;
      var cX = tX;
      var cY = tY;
      var glowRaf = null;
      var idleTimer = null;

      function glowTick() {
        cX += (tX - cX) * 0.15;
        cY += (tY - cY) * 0.15;
        glow.style.setProperty('--gx', cX.toFixed(1) + 'px');
        glow.style.setProperty('--gy', cY.toFixed(1) + 'px');
        glowRaf = window.requestAnimationFrame(glowTick);
      }

      window.addEventListener('pointermove', function (e) {
        tX = e.clientX;
        tY = e.clientY;

        if (glowRaf === null) {
          cX = tX; // 首次直接落位，避免从屏幕中心飞过来
          cY = tY;
          document.body.classList.add('has-pointer');
          glowRaf = window.requestAnimationFrame(glowTick);
        }

        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(function () {
          window.cancelAnimationFrame(glowRaf);
          glowRaf = null;
        }, 500);
      }, { passive: true });
    }

    /* 8.2 作品卡片 3D 倾斜，最大 2.5°，克制 */
    var MAX_TILT = 2.5;
    projectList.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (px * MAX_TILT * 2).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-py * MAX_TILT * 2).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });

    /* 8.3 磁性按钮：最大偏移 4px */
    var MAGNET = 4;
    Array.prototype.slice.call(document.querySelectorAll('.btn')).forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        btn.style.setProperty('--bx', (dx * MAGNET).toFixed(2) + 'px');
        btn.style.setProperty('--by', (dy * MAGNET).toFixed(2) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--bx', '0px');
        btn.style.setProperty('--by', '0px');
      });
    });
  }

  /* ---------- 9. 作品封面大图预览 ---------- */
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCaption = document.getElementById('lbCaption');
  var lbClose = document.getElementById('lbClose');
  var thumbs = Array.prototype.slice.call(document.querySelectorAll('.thumb'));
  var lastFocused = null;

  function openLightbox(thumb) {
    var img = thumb.querySelector('img');
    if (!img || !lightbox) return;

    var card = thumb.closest ? thumb.closest('.project') : null;
    var title = card ? card.querySelector('h3') : null;

    lbImg.setAttribute('src', img.currentSrc || img.src);
    lbImg.setAttribute('alt', img.getAttribute('alt') || '');
    lbCaption.textContent = title ? title.textContent.trim() : '';

    lastFocused = document.activeElement;
    lightbox.hidden = false;
    void lightbox.offsetHeight; // 触发重排，让透明度过渡从 0 开始
    lightbox.classList.add('is-open');
    document.body.classList.add('no-scroll');
    if (lbClose) lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;

    lightbox.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    window.setTimeout(function () {
      lightbox.hidden = true;
      lbImg.setAttribute('src', '');
    }, 280);

    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  if (lightbox && thumbs.length && lbImg && lbClose) {
    thumbs.forEach(function (thumb) {
      var img = thumb.querySelector('img');
      var desc = img && img.getAttribute('alt') ? img.getAttribute('alt') : '作品封面';

      thumb.setAttribute('role', 'button');
      thumb.setAttribute('tabindex', '0');
      thumb.setAttribute('aria-label', '查看大图：' + desc);

      thumb.addEventListener('click', function () { openLightbox(thumb); });
      thumb.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          openLightbox(thumb);
        }
      });
    });

    lbClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      // 点遮罩空白处关闭，点图片本身不关
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
    });
  }
})();
