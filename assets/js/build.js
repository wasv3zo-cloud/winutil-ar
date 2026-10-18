/* =====================================================================
   build.js — منشئ الإعداد (build/index.html)
   ---------------------------------------------------------------------
   الزائر يختار برامج وتحسينات، فنبني له ملف إعداد بالشكل الذي تقرؤه
   الأداة نفسها: مصفوفة JSON من المفاتيح، مثل:
       ["WPFInstallfirefox", "WPFTweaksTelemetry"]
   ثم أمرًا يشغّل الأداة بهذا الملف (-Config) فتطبّقه دون واجهة.

   البيانات: assets/data/apps.json و tweaks.json و presets.json،
   يولّدها tools/site/build_site.py من ملفات الأداة في كل بناء.

   الفهرس: 1. الحالة  2. التحميل  3. الرسم  4. المساعد  5. المخرجات  6. التشغيل
   ===================================================================== */

(() => {
  'use strict';
  const S = window.SITE || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ROOT = document.documentElement.dataset.root || '';
  // أمر التشغيل يأتي من config.js وحده (مصدر واحد)؛ نأخذ منه جزء التنزيل لنمرّر ملف الإعداد
  const LOADER = (S.command || '').replace(/^iex \(/, '').replace(/\)$/, '');
  const CONFIG_NAME = 'winutil-config.json';

  /* ---------- 1. الحالة ---------- */
  const picked = new Set();           // مفاتيح مختارة: WPFInstall… و WPFTweaks…
  let apps = [], tweaks = [], presets = {};
  const isApp = (k) => k.startsWith('WPFInstall');

  /* ---------- 2. التحميل ---------- */
  async function load() {
    const get = (f) => fetch(ROOT + 'assets/data/' + f).then((r) => r.json());
    [apps, tweaks, presets] = await Promise.all([get('apps.json'), get('tweaks.json'), get('presets.json')]);
    // تحسينات «المفاتيح» (تشغيل/إيقاف) تبقى في الأداة نفسها: معنى اختيارها في ملف إعداد غير واضح
    tweaks = tweaks.filter((t) => !t.toggle);
    readUrl();
    renderApps(); renderTweaks(); update();
  }

  /* ---------- 3. الرسم ---------- */
  const group = (list, by) => list.reduce((g, x) => ((g[x[by]] = g[x[by]] || []).push(x), g), {});

  function renderApps(filter = '') {
    const q = filter.trim().toLowerCase();
    const list = q ? apps.filter((a) => (a.name + ' ' + a.key).toLowerCase().includes(q)) : apps;
    const groups = group(list, 'cat');
    $('#appList').innerHTML = Object.entries(groups).map(([cat, items]) => `
      <div class="pick-group"><h3>${esc(cat)} <span class="muted small">(${items.length})</span></h3>
        <div class="pick-grid">${items.map((a) => `
          <label class="pick${picked.has(a.id) ? ' on' : ''}"><input type="checkbox" value="${esc(a.id)}"${picked.has(a.id) ? ' checked' : ''}>
            <span>${esc(a.name)}</span>${a.foss ? '<i class="foss" title="مفتوح المصدر"></i>' : ''}</label>`).join('')}
        </div></div>`).join('') || '<p class="muted">لا توجد نتائج.</p>';
  }

  function renderTweaks() {
    const groups = group(tweaks, 'cat');
    $('#tweakList').innerHTML = Object.entries(groups).map(([cat, items]) => `
      <div class="pick-group"><h3>${esc(cat)}</h3>
        <div class="pick-grid pick-grid--wide">${items.map((t) => `
          <label class="pick${picked.has(t.id) ? ' on' : ''}"><input type="checkbox" value="${esc(t.id)}"${picked.has(t.id) ? ' checked' : ''}>
            <span>${esc(t.title)}</span><span class="badge-risk ${esc(t.risk)}"></span>
            <a href="${ROOT}tweaks/${esc(t.slug)}/" target="_blank" class="pick__info" title="ماذا يفعل؟">؟</a></label>`).join('')}
        </div></div>`).join('');
  }

  // تحديد/إلغاء أي خانة (تفويض حدث واحد لكل القوائم)
  document.addEventListener('change', (e) => {
    const box = e.target.closest('.pick input'); if (!box) return;
    box.checked ? picked.add(box.value) : picked.delete(box.value);
    box.parentElement.classList.toggle('on', box.checked);
    update();
  });

  function update() {
    const a = [...picked].filter(isApp), t = [...picked].filter((k) => !isApp(k));
    $('#cApps').textContent = a.length; $('#cTweaks').textContent = t.length;
    $('#sumText').textContent = picked.size ? `${a.length} برنامج و${t.length} تحسين` : 'لم تختر شيئًا بعد.';
    const name = (k) => (apps.find((x) => x.id === k) || tweaks.find((x) => x.id === k) || {}).name
      || (tweaks.find((x) => x.id === k) || {}).title || k;
    $('#sumChips').innerHTML = [...picked].slice(0, 30).map((k) =>
      `<button class="sum-chip" data-k="${esc(k)}" title="إزالة">${esc(name(k))} ×</button>`).join('') + (picked.size > 30 ? `<span class="muted small">+${picked.size - 30}</span>` : '');
    ['#dlBtn', '#cmdBtn', '#shareBtn'].forEach((id) => { $(id).disabled = !picked.size; });
    writeUrl();
  }

  $('#sumChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.sum-chip'); if (!chip) return;
    picked.delete(chip.dataset.k);
    $$(`.pick input[value="${chip.dataset.k}"]`).forEach((b) => { b.checked = false; b.parentElement.classList.remove('on'); });
    update();
  });

  $('#appSearch').addEventListener('input', (e) => renderApps(e.target.value));
  $$('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    (presets[b.dataset.preset] || []).forEach((k) => { if (tweaks.some((t) => t.id === k)) picked.add(k); });
    renderTweaks(); update();
  }));
  $('#clearTweaks').addEventListener('click', () => {
    [...picked].filter((k) => !isApp(k)).forEach((k) => picked.delete(k));
    renderTweaks(); update();
  });

  /* ---------- 4. المساعد ----------
     إجابات الأسئلة الثلاثة → إعداد مقترح. «المتقدم» لا يُقترح أبدًا تلقائيًا. */
  const answers = {};
  $$('#wizard .q').forEach((q) => q.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    $$('.chip', q).forEach((c) => c.classList.toggle('on', c === chip));
    answers[q.dataset.q] = chip.dataset.v;
    $('#wizardApply').disabled = Object.keys(answers).length < 3;
  }));

  const USE_APPS = {
    gaming: ['steam', 'discord', 'epicgames', '7zip', 'brave'],
    work: ['chrome', 'zoom', 'teams', 'libreoffice', '7zip', 'sumatra'],
    dev: ['vscode', 'git', 'nodejs', 'python3', 'firefox', 'powertoys'],
    study: ['chrome', 'libreoffice', 'obsidian', 'sumatra', 'vlc', 'zoom'],
  };

  $('#wizardApply').addEventListener('click', () => {
    picked.clear();
    // الأساس: «أساسي»، ثم وصفة الخصوصية أو الألعاب أو الأجهزة الضعيفة حسب الإجابات
    (presets.Minimal || []).forEach((k) => picked.add(k));
    if (answers.privacy === 'high') (presets.Privacy || presets.Standard || []).forEach((k) => picked.add(k));
    if (answers.use === 'gaming') (presets.Gaming || []).forEach((k) => picked.add(k));
    if (answers.device === 'laptop') picked.delete('WPFTweaksHiber');          // الإسبات مفيد للمحمول
    (USE_APPS[answers.use] || []).forEach((k) => picked.add('WPFInstall' + k));
    // أبقِ فقط ما هو موجود فعلًا في هذه النسخة من الأداة
    [...picked].forEach((k) => { if (!apps.some((a) => a.id === k) && !tweaks.some((t) => t.id === k)) picked.delete(k); });
    renderApps($('#appSearch').value); renderTweaks(); update();
    toast(`اقترحنا ${picked.size} عنصرًا — راجعها وعدّل ما تريد`);
    $('.summary').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  /* ---------- 5. المخرجات ---------- */
  const configJson = () => JSON.stringify([...picked], null, 2);

  // نفس صيغة الأمر الذي تنسخه الأداة عند «تصدير» الإعداد
  const command = () =>
    `iex "& { $(${LOADER}) } -Config '$env:USERPROFILE\\Downloads\\${CONFIG_NAME}'"`;

  $('#dlBtn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([configJson()], { type: 'application/json' }));
    a.download = CONFIG_NAME; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('حُمِّل الملف — الآن انسخ أمر التشغيل');
  });
  $('#cmdBtn').addEventListener('click', async () => { await copy(command()); toast('نُسخ الأمر — الصقه في PowerShell كمسؤول'); });
  $('#shareBtn').addEventListener('click', async () => { await copy(location.href); toast('نُسخ رابط الإعداد'); });

  // الإعداد يُحفظ في الرابط نفسه (#a=…&t=…)، فيمكن مشاركته أو الرجوع إليه
  function writeUrl() {
    const a = [...picked].filter(isApp).map((k) => k.slice(10)), t = [...picked].filter((k) => !isApp(k)).map((k) => k.replace(/^WPFTweaks/, ''));
    const hash = (a.length ? 'a=' + a.join(',') : '') + (t.length ? (a.length ? '&' : '') + 't=' + t.join(',') : '');
    history.replaceState(null, '', hash ? '#' + hash : location.pathname + location.search);
  }
  function readUrl() {
    const p = new URLSearchParams(location.hash.slice(1));
    (p.get('a') || '').split(',').filter(Boolean).forEach((k) => picked.add('WPFInstall' + k));
    (p.get('t') || '').split(',').filter(Boolean).forEach((k) => picked.add('WPFTweaks' + k));
    const add = new URLSearchParams(location.search).get('add');   // من صفحات البرامج: ?add=firefox
    if (add) picked.add('WPFInstall' + add);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
  }
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- 6. التشغيل ---------- */
  load().catch(() => { $('#appList').innerHTML = '<p class="muted">تعذّر تحميل القوائم. حدّث الصفحة.</p>'; });
})();
