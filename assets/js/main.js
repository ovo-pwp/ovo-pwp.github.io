/* ==========================================================================
   李然 · 个人作品集 · 交互脚本
   1) 主题切换   2) 滚动显现   3) 导航高亮   4) 移动菜单   5) 作品筛选
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
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;

    if (header) header.classList.toggle('is-scrolled', y > 8);

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
})();
