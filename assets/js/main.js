/* =====================================================================
   main.js — كل تفاعلات الموقع في ملف واحد
   ---------------------------------------------------------------------
   يعمل بعد تحميل الصفحة، ويقرأ الإعدادات من config.js (المتغير SITE).
   كل وظيفة مستقلة في دالة خاصة بها، وتُستدعى كلها في آخر الملف.

   الفهرس:
   1. مكتبة الأيقونات (SVG)
   2. رسم الشريط العلوي والتذييل
   3. تبديل الوضع الفاتح/الداكن
   4. القائمة على الجوال + ظل الشريط عند التمرير
   5. صناديق الأمر وأزرار النسخ
   6. التبويبات
   7. مكبّر الصور
   8. الحركة عند الظهور
   9. البحث في الأسئلة الشائعة
   10. فهرس الصفحة النشط (في الدليل)
   11. التشغيل
   ===================================================================== */

(() => {
  'use strict';
  const S = window.SITE || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];


  /* ---------- 1. مكتبة الأيقونات ----------
     كل أيقونة هي «مسار رسم» SVG. لاستخدام أيقونة في أي صفحة اكتب:
       <i data-icon="bolt"></i>
     وستُستبدل تلقائيًا بالرسم. لإضافة أيقونة جديدة أضف سطرًا هنا
     (يمكن نسخ المسارات من موقع lucide.dev).                         */
  const ICONS = {
    bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.8C22 5.5 17.5 2 12 2z"/>',
    terminal: '<path d="M4 17l6-5-6-5"/><path d="M12 19h8"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    arrow: '<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>',
    github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.4 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.6 16 2.5a13.4 13.4 0 0 0-7 0C6.3.6 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.6 6.4 7a3.4 3.4 0 0 0-.9 2.6V22"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    windows: '<path d="M3 5.5l7-1v7H3zM12 4.2l9-1.2v8.5h-9zM3 12.5h7v7l-7-1zM12 12.5h9V21l-9-1.2z"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    logo: '<path d="M4 7l4.5 11L12 10l3.5 8L20 7"/>',
  };

  /* تُرجع كود SVG كاملًا لأيقونة بالاسم */
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* تبحث عن كل <i data-icon="..."> وتضع الأيقونة مكانه */
  function renderIcons(root = document) {
    $$('[data-icon]', root).forEach((el) => {
      el.outerHTML = icon(el.dataset.icon);
    });
  }


  /* ---------- 2. الشريط العلوي والتذييل ----------
     بدل تكرار القائمة في كل صفحة، تُبنى هنا مرة واحدة من config.js.
     الصفحة الحالية تُعلَّم تلقائيًا (aria-current) لتظهر بلون مميز.   */
  function renderChrome() {
    // ROOT = المسافة من الصفحة الحالية إلى جذر الموقع ('' أو '../' أو '../../')، من data-root في <html>
    const ROOT = document.documentElement.dataset.root || '';
    // مجلد القسم الحالي، مثل 'tweaks/' أو 'guide/'، لتلوين رابطه في القائمة
    const here = (new URL(ROOT || './', location.href)).pathname;
    const section = location.pathname.slice(here.length).split('/')[0];
    const links = (S.nav || [])
      .map((l) => `<a href="${ROOT}${l.href}"${section && l.href.startsWith(section + '/') ? ' aria-current="page"' : ''}>${l.label}</a>`)
      .join('');

    const header = $('#site-header');
    if (header) {
      header.className = 'header';
      header.innerHTML = `
        <div class="wrap header__in">
          <a class="brand" href="${ROOT || './'}" aria-label="${S.name} — الرئيسية">
            <span class="brand__mark">${icon('logo')}</span>${S.name}
          </a>
          <nav class="nav" id="nav" aria-label="القائمة الرئيسية">${links}</nav>
          <div class="header__actions">
            <button class="icon-btn" id="searchBtn" aria-label="بحث (اختصار /)">${icon('search')}</button>
            <button class="icon-btn" id="themeBtn" aria-label="تبديل الوضع الفاتح والداكن">${icon('sun')}</button>
            <a class="icon-btn" href="${S.repo}" target="_blank" rel="noopener" aria-label="المستودع على GitHub">${icon('github')}</a>
            <a class="btn btn--primary btn--sm header__cta" href="${ROOT}#run">${icon('terminal')}شغّل الأداة</a>
            <button class="icon-btn menu-toggle" id="menuBtn" aria-label="فتح القائمة" aria-expanded="false" aria-controls="nav">${icon('menu')}</button>
          </div>
        </div>`;
    }

    const footer = $('#site-footer');
    if (footer) {
      footer.className = 'footer';
      footer.innerHTML = `
        <div class="wrap">
          <div class="footer__grid">
            <div>
              <a class="brand" href="${ROOT || './'}"><span class="brand__mark">${icon('logo')}</span>${S.name}</a>
              <p class="mt-s">أداة مجانية مفتوحة المصدر لتسريع ويندوز وتنظيفه، بواجهة عربية كاملة.</p>
            </div>
            <div><h4>الصفحات</h4><ul>${(S.nav || []).map((l) => `<li><a href="${ROOT}${l.href}">${l.label}</a></li>`).join('')}</ul></div>
            <div><h4>المشروع</h4><ul>
              <li><a href="${S.repo}" target="_blank" rel="noopener">الكود على GitHub</a></li>
              <li><a href="${S.issues}" target="_blank" rel="noopener">أبلغ عن مشكلة</a></li>
              <li><a href="${ROOT}cheatsheet/">دليل تعديل الموقع</a></li>
              <li><a href="${ROOT}changelog/">سجل الإصدارات</a></li>
              <li><a href="${ROOT}studio/">استوديو التصميم</a></li>
            </ul></div>
          </div>
          <div class="footer__bottom"><span>${S.footer || ''}</span><span id="buildBadge" class="build-badge" hidden></span></div>
        </div>`;
    }

    // الزر العائم لدليل التعديل (لا يظهر داخل صفحة الدليل نفسها)
    if (section !== 'cheatsheet') {
      document.body.insertAdjacentHTML('beforeend',
        `<a class="fab" href="${ROOT}cheatsheet/" aria-label="دليل تعديل الموقع">${icon('edit')}<span>دليل التعديل</span></a>`);
    }
    // عناصر مشتركة: الإشعار ومكبّر الصور
    document.body.insertAdjacentHTML('beforeend',
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>' +
      '<div class="lightbox" id="lightbox" aria-hidden="true"><img alt=""></div>');
  }


  /* ---------- 3. الوضع الفاتح/الداكن ----------
     يُحفظ اختيار الزائر في المتصفح (localStorage) ليبقى في كل الصفحات.
     try/catch لأن بعض المتصفحات تمنع التخزين في الوضع الخاص.          */
  function initTheme() {
    const root = document.documentElement;
    const btn = $('#themeBtn');
    const apply = (t) => {
      if (t === 'light') root.dataset.theme = 'light'; else delete root.dataset.theme;
      if (btn) btn.innerHTML = icon(t === 'light' ? 'moon' : 'sun');
    };
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    apply(saved);
    btn?.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      apply(next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }


  /* ---------- 4. القائمة والشريط ---------- */
  function initHeader() {
    const nav = $('#nav'), btn = $('#menuBtn'), header = $('#site-header');
    btn?.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      btn.innerHTML = icon(open ? 'close' : 'menu');
    });
    // إغلاق القائمة عند اختيار رابط
    $$('a', nav).forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('open'); btn?.setAttribute('aria-expanded', 'false');
      if (btn) btn.innerHTML = icon('menu');
    }));
    // إظهار خط أسفل الشريط بعد بدء التمرير
    const onScroll = () => header?.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }


  /* ---------- 5. صناديق الأمر والنسخ ----------
     أي عنصر فيه data-cmd يُملأ بأمر التشغيل من config.js.
     أي زر فيه data-copy ينسخ نص العنصر المحدد (أو الأمر إن كان فارغًا). */
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      // طريقة احتياطية للمتصفحات القديمة
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
  }

  function initCopy() {
    $$('[data-cmd]').forEach((el) => { el.textContent = S.command; });
    $$('[data-copy]').forEach((btn) => {
      const label = btn.innerHTML;
      btn.addEventListener('click', async () => {
        const target = btn.dataset.copy ? $(btn.dataset.copy) : null;
        const text = btn.dataset.text || (target ? target.textContent.trim() : S.command);
        await copyText(text);
        btn.classList.add('is-done');
        btn.innerHTML = icon('check') + 'تم النسخ';
        toast(btn.dataset.toast || 'تم النسخ — الصقه في PowerShell');
        setTimeout(() => { btn.classList.remove('is-done'); btn.innerHTML = label; }, 2000);
      });
    });
  }


  /* ---------- 6. التبويبات ----------
     البنية: [data-tabs] يحتوي أزرار .tab ، وكل زر يشير إلى لوحة
     عبر aria-controls. تدعم لوحة المفاتيح (الأسهم يمين/يسار).        */
  function initTabs() {
    $$('[data-tabs]').forEach((list) => {
      const tabs = $$('.tab', list);
      const select = (tab) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute('aria-selected', on);
          t.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      };
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(t));
        t.addEventListener('keydown', (e) => {
          // في الاتجاه العربي: السهم الأيسر = التالي
          const step = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;
          if (!step) return;
          const next = tabs[(i + step + tabs.length) % tabs.length];
          next.focus(); select(next);
        });
      });
    });
  }


  /* ---------- 7. مكبّر الصور ----------
     كل صورة فيها data-zoom تُفتح بحجم كبير عند الضغط، وتُغلق بالضغط
     أو بزر Esc.                                                      */
  function initLightbox() {
    const lb = $('#lightbox'); if (!lb) return;
    const img = $('img', lb);
    const close = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); };
    $$('img[data-zoom]').forEach((el) => el.addEventListener('click', () => {
      img.src = el.currentSrc || el.src; img.alt = el.alt;
      lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
    }));
    lb.addEventListener('click', close);
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }


  /* ---------- 8. الحركة عند الظهور ----------
     العناصر ذات الصنف reveal تظهر بانسياب عند وصولها للشاشة.          */
  function initReveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((e) => io.observe(e));
  }


  /* ---------- 9. البحث في الأسئلة ----------
     يُخفي الأسئلة التي لا تحتوي الكلمة المكتوبة.                       */
  function initFaqSearch() {
    const input = $('#faqSearch'); if (!input) return;
    const items = $$('.faq details'), empty = $('#faqEmpty');
    input.addEventListener('input', () => {
      const q = input.value.trim();
      let shown = 0;
      items.forEach((d) => {
        const hit = !q || d.textContent.includes(q);
        d.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      if (empty) empty.style.display = shown ? 'none' : 'block';
    });
  }


  /* ---------- 10. فهرس الصفحة ----------
     يلوّن رابط القسم الذي يقرؤه الزائر حاليًا في الفهرس الجانبي.        */
  function initToc() {
    const links = $$('.toc a'); if (!links.length) return;
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) {
        links.forEach((a) => a.classList.remove('active'));
        map.get(en.target.id)?.classList.add('active');
      }
    }), { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }



  /* ---------- 12. البحث الموحّد ----------
     زر العدسة أو الضغط على «/» يفتح نافذة تبحث في الصفحات والتحسينات
     والبرامج معًا. الفهرس assets/data/search.json يولّده البناء التلقائي.  */
  function initSearch() {
    const ROOT = document.documentElement.dataset.root || '';
    document.body.insertAdjacentHTML('beforeend', `
      <div class="spotlight" id="spotlight" hidden>
        <div class="spotlight__box" role="dialog" aria-label="بحث في الموقع">
          <div class="spotlight__input">${icon('search')}<input id="spotInput" type="search" placeholder="ابحث عن تحسين، برنامج، أو صفحة…" autocomplete="off"><kbd>Esc</kbd></div>
          <ul class="spotlight__list" id="spotList"></ul>
        </div>
      </div>`);
    const box = $('#spotlight'), input = $('#spotInput'), list = $('#spotList');
    let index = null, active = 0, results = [];
    // تطبيع عربي بسيط: يوحّد الهمزات والتاء المربوطة والياء، ويزيل التشكيل
    const norm = (t) => (t || '').toLowerCase().replace(/[ً-ْ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    const open = async () => {
      box.hidden = false; input.value = ''; input.focus();
      if (!index) {
        try { index = await (await fetch(ROOT + 'assets/data/search.json')).json(); } catch (e) { index = []; }
      }
      render();
    };
    const close = () => { box.hidden = true; };
    const render = () => {
      const q = norm(input.value.trim());
      results = (q ? index.filter((r) => norm(r.t + ' ' + r.d).includes(q)) : index.filter((r) => r.k === 'صفحة')).slice(0, 12);
      active = 0;
      list.innerHTML = results.length ? results.map((r, i) =>
        `<li><a href="${ROOT}${r.u}" class="${i === 0 ? 'on' : ''}"><span class="tag">${r.k}</span><b>${r.t}</b><span class="muted small">${r.d || ''}</span></a></li>`).join('')
        : '<li class="muted" style="padding:16px">لا توجد نتائج</li>';
    };
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      const links = $$('a', list);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links.forEach((a, i) => a.classList.toggle('on', i === active));
        links[active]?.scrollIntoView({ block: 'nearest' });
      }
      if (e.key === 'Enter' && links[active]) location.href = links[active].href;
    });
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    $('#searchBtn')?.addEventListener('click', open);
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !box.hidden) close();
      if (e.key === '/' && box.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
    });
  }

  /* ---------- 13. فلترة المكتبات (التحسينات والبرامج) ---------- */
  function initLibFilter() {
    const input = $('#libFilter'); if (!input) return;
    const cards = $$('.lib-card'), empty = $('#libEmpty');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      cards.forEach((c) => { const hit = !q || c.dataset.filter.toLowerCase().includes(q); c.hidden = !hit; if (hit) shown++; });
      $$('.lib-group').forEach((h) => { const grid = h.nextElementSibling; h.hidden = grid && !$$('.lib-card:not([hidden])', grid).length; });
      if (empty) empty.style.display = shown ? 'none' : 'block';
    });
  }

  /* ---------- 14. شارة الإصدار والبصمة ----------
     تقرأ assets/data/build.json (يولّده البناء) وتعرض الإصدار في التذييل،
     والبصمة SHA256 في أي عنصر data-build="sha256".                     */
  async function initBuildInfo() {
    const ROOT = document.documentElement.dataset.root || '';
    let b;
    try { b = await (await fetch(ROOT + 'assets/data/build.json', { cache: 'no-store' })).json(); } catch (e) { return; }
    const badge = $('#buildBadge');
    if (badge && b.version) { badge.hidden = false; badge.innerHTML = `${icon('check')} الإصدار ${b.version} · ${b.date}`; }
    $$('[data-build]').forEach((el) => { if (b[el.dataset.build]) el.textContent = b[el.dataset.build]; });
    const info = $('#buildInfo'); if (info && b.version) info.textContent = `آخر إصدار: ${b.version}`;
  }

  /* ---------- 15. الجوال ----------
     الأداة لا تعمل على الجوال، فبدل «نسخ الأمر» نعرض «أرسل الرابط لجهازي». */
  function initMobile() {
    if (!/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) return;
    $$('.cmd').forEach((cmd) => {
      if (cmd.dataset.mobile) return;
      cmd.dataset.mobile = '1';
      cmd.insertAdjacentHTML('beforebegin', `<div class="mobile-note">${icon('windows')}<div><b>الأداة تعمل على ويندوز فقط.</b><br>أرسل الرابط لنفسك وافتحه من الكمبيوتر.</div><button class="btn btn--primary btn--sm" type="button">أرسل الرابط</button></div>`);
      cmd.previousElementSibling.querySelector('button').addEventListener('click', async () => {
        const data = { title: S.name, text: 'أداة WinUtil العربي لتسريع ويندوز', url: location.origin + location.pathname };
        try { if (navigator.share) await navigator.share(data); else { await copyText(data.url); toast('نُسخ الرابط'); } } catch (e) {}
      });
    });
  }

  /* ---------- 16. طرفية حية في الرئيسية ----------
     الأمر يُكتب حرفًا حرفًا مرة واحدة عند فتح الصفحة (ويُعرض كاملًا فورًا
     لمن فعّل «تقليل الحركة»).                                          */
  function initTyping() {
    const pre = $('.hero .cmd pre[data-cmd]'); if (!pre) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const full = S.command; let i = 0;
    pre.textContent = ''; pre.classList.add('typing');
    const step = () => {
      i = Math.min(full.length, i + 3);
      pre.textContent = full.slice(0, i);
      if (i < full.length) setTimeout(step, 12); else pre.classList.remove('typing');
    };
    setTimeout(step, 400);
  }

  /* ---------- 11. التشغيل ---------- */
  renderChrome();
  renderIcons();
  initTheme();
  initHeader();
  initCopy();
  initTabs();
  initLightbox();
  initReveal();
  initFaqSearch();
  initToc();
  initSearch();
  initLibFilter();
  initBuildInfo();
  initMobile();
  initTyping();
})();
