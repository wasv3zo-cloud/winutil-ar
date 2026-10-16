/* =====================================================================
   studio.js — استوديو التصميم (studio.html)
   ---------------------------------------------------------------------
   الفكرة في ثلاث طبقات:
   1. الحالة (state): كائن واحد فيه كل الألوان والشعار. أي تغيير يمر منه.
   2. المعاينة: render() تنسخ الحالة إلى متغيرات CSS على نافذة المعاينة،
      فيتغير شكلها فورًا دون إعادة تحميل.
   3. الحفظ: saveToGitHub() تحوّل الحالة إلى branding/brand.json (+ الشعار)
      وترسلهما إلى المستودع في commit واحد عبر GitHub REST API.
      بعدها يتولى .github/workflows/brand-rebuild.yaml إعادة البناء.

   الفهرس:
   1. الإعدادات والحقول
   2. الحالة والمعاينة
   3. بناء الحقول وربطها
   4. الشعار (رفع، تصغير، إزالة)
   5. التحميل من GitHub
   6. التصدير والتراجع
   7. عميل GitHub API
   8. الحفظ وتتبّع البناء
   9. التشغيل
   ===================================================================== */

(() => {
  'use strict';
  const S = window.SITE || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- 1. الإعدادات والحقول ---------- */
  const REPO = (S.repo || '').replace('https://github.com/', '');   // مثل wasv3zo-cloud/2219was
  const BRAND_PATH = 'branding/brand.json';
  const LOGO_PATH = 'branding/logo.png';
  const LOGO_SIZE = 256;                // أبعاد الشعار بعد التحويل (بكسل)
  const MAX_LOGO_BYTES = 300 * 1024;    // الحد نفسه في tools/Apply-Brand.ps1
  const HEX = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;

  /* كل حقل في اللوحة:
     id    : اسمه في الحالة ومتغير CSS في المعاينة (--id)
     keys  : مفاتيح themes.json التي يكتب فيها (حقل واحد قد يغيّر عدة مفاتيح)
     group : المجموعة التي يظهر فيها (data-group في studio.html)       */
  const FIELDS = [
    { id: 'bg', label: 'الخلفية', group: 'ui', keys: ['MainBackgroundColor'] },
    { id: 'fg', label: 'النص', group: 'ui', keys: ['MainForegroundColor'] },
    { id: 'accent', label: 'اللون المميز', group: 'ui', keys: ['ProgressBarForegroundColor', 'ToggleButtonOnColor'] },
    { id: 'border', label: 'الحدود', group: 'ui', keys: ['BorderColor'] },
    { id: 'link', label: 'الروابط', group: 'ui', keys: ['LinkForegroundColor'] },
    { id: 'button', label: 'الأزرار', group: 'ui', keys: ['ButtonBackgroundColor'] },
    { id: 'tab-install', label: 'التثبيت', group: 'tabs', keys: ['ButtonInstallBackgroundColor'] },
    { id: 'tab-tweaks', label: 'التحسينات', group: 'tabs', keys: ['ButtonTweaksBackgroundColor'] },
    { id: 'tab-config', label: 'الإعدادات', group: 'tabs', keys: ['ButtonConfigBackgroundColor'] },
    { id: 'tab-updates', label: 'التحديثات', group: 'tabs', keys: ['ButtonUpdatesBackgroundColor'] },
    { id: 'tab-win11', label: 'ويندوز 11', group: 'tabs', keys: ['ButtonWin11ISOBackgroundColor'] },
    { id: 'tab-fg', label: 'نص التبويبات', group: 'tabs',
      keys: ['ButtonInstallForegroundColor', 'ButtonTweaksForegroundColor', 'ButtonConfigForegroundColor', 'ButtonUpdatesForegroundColor', 'ButtonWin11ISOForegroundColor'] },
    { id: 'logo1', label: 'الجزء الأيسر', group: 'logo', logo: 'path1' },
    { id: 'logo2', label: 'الجزء الأيمن', group: 'logo', logo: 'path2' },
    { id: 'logo3', label: 'القاعدة', group: 'logo', logo: 'path3' },
  ];

  /* القيم الافتراضية = الهوية الخضراء الحالية (تُستخدم إن تعذّر التحميل من GitHub) */
  const DEFAULTS = {
    bg: '#0F1F17', fg: '#E8F5EC', accent: '#22C55E', border: '#2A5240', link: '#86EFAC', button: '#163326',
    'tab-install': '#14532D', 'tab-tweaks': '#166534', 'tab-config': '#15803D', 'tab-updates': '#16A34A', 'tab-win11': '#1F7A4D',
    'tab-fg': '#F7F7F7', logo1: '#0567FF', logo2: '#22C55E', logo3: '#A3A4A6',
  };

  /* القوالب الجاهزة: كل قالب يغيّر بعض الحقول فقط */
  const PRESETS = [
    { name: 'أخضر', swatch: '#22C55E', values: { ...DEFAULTS } },
    { name: 'أزرق', swatch: '#3B82F6', values: { bg: '#0B1324', fg: '#E6EDF7', accent: '#3B82F6', border: '#22324F', link: '#93C5FD', button: '#15213A',
      'tab-install': '#1E3A8A', 'tab-tweaks': '#1D4ED8', 'tab-config': '#2563EB', 'tab-updates': '#2554C7', 'tab-win11': '#1E40AF', 'tab-fg': '#F8FAFC', logo1: '#60A5FA', logo2: '#3B82F6', logo3: '#94A3B8' } },
    { name: 'بنفسجي', swatch: '#8B5CF6', values: { bg: '#140F24', fg: '#EEE9FB', accent: '#8B5CF6', border: '#33285A', link: '#C4B5FD', button: '#211940',
      'tab-install': '#4C1D95', 'tab-tweaks': '#5B21B6', 'tab-config': '#6D28D9', 'tab-updates': '#7C3AED', 'tab-win11': '#5B21B6', 'tab-fg': '#FAF5FF', logo1: '#A78BFA', logo2: '#8B5CF6', logo3: '#A1A1AA' } },
    { name: 'برتقالي', swatch: '#F97316', values: { bg: '#1C130C', fg: '#FBEFE4', accent: '#F97316', border: '#4A3020', link: '#FDBA74', button: '#2D1E13',
      'tab-install': '#9A3412', 'tab-tweaks': '#C2410C', 'tab-config': '#B45309', 'tab-updates': '#A16207', 'tab-win11': '#7C2D12', 'tab-fg': '#FFF7ED', logo1: '#FB923C', logo2: '#F97316', logo3: '#A8A29E' } },
    { name: 'رمادي', swatch: '#A1A1AA', values: { bg: '#18181B', fg: '#F4F4F5', accent: '#A1A1AA', border: '#3F3F46', link: '#D4D4D8', button: '#27272A',
      'tab-install': '#3F3F46', 'tab-tweaks': '#52525B', 'tab-config': '#3F3F46', 'tab-updates': '#52525B', 'tab-win11': '#3F3F46', 'tab-fg': '#FAFAFA', logo1: '#E4E4E7', logo2: '#A1A1AA', logo3: '#71717A' } },
  ];


  /* ---------- 2. الحالة والمعاينة ---------- */
  const state = {
    colors: { ...DEFAULTS },  // id → #hex
    logoImage: null,          // dataURL للشعار المرفوع، أو null
    remoteHasLogo: false,     // هل يوجد logo.png في المستودع حاليًا؟
    remoteBrand: null,        // brand.json كما حُمِّل (للحفاظ على أي مفاتيح لا تعرفها اللوحة)
  };
  let saved = '';
  let thumbPlaceholder = '';  // أيقونة مربع الرفع قبل اختيار صورة             // لقطة من الحالة عند آخر تحميل/حفظ، لمعرفة وجود تغييرات

  const snapshot = () => JSON.stringify({ c: state.colors, l: state.logoImage });
  const isDirty = () => snapshot() !== saved;

  /* تنسخ الحالة إلى متغيرات CSS على المعاينة، وتحدّث الحقول والتنبيهات */
  function render() {
    const pv = $('#preview');
    for (const [id, value] of Object.entries(state.colors)) pv.style.setProperty(`--${id}`, value);

    // صورة الشعار تحل محل الشعار المرسوم
    const img = $('#pvLogo img'), svg = $('#pvLogo svg');
    img.hidden = !state.logoImage; svg.style.display = state.logoImage ? 'none' : '';
    if (state.logoImage) img.src = state.logoImage;
    $('#logoThumb').innerHTML = state.logoImage ? `<img src="${state.logoImage}" alt="">` : thumbPlaceholder;
    $('#logoRemove').hidden = !state.logoImage;

    // مزامنة الحقول مع الحالة (مهم بعد القوالب والتراجع)
    FIELDS.forEach((f) => {
      const row = $(`[data-field="${f.id}"]`); if (!row) return;
      const v = state.colors[f.id];
      $('input[type=color]', row).value = v.slice(0, 7);
      const text = $('input[type=text]', row);
      if (document.activeElement !== text) text.value = v.toUpperCase();
    });

    renderContrast();
    const dirty = isDirty();
    $('#dirty').hidden = !dirty;
    $('#saveBtn').disabled = !dirty;
  }

  /* ---- تباين الألوان (WCAG): ينبّه إن صار النص صعب القراءة ---- */
  function luminance(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  }
  function renderContrast() {
    const c = state.colors;
    const pairs = [['النص على الخلفية', c.fg, c.bg], ...['install', 'tweaks', 'config', 'updates', 'win11'].map((t) => [`نص تبويب ${FIELDS.find((f) => f.id === 'tab-' + t).label}`, c['tab-fg'], c['tab-' + t]])];
    const weak = pairs.filter(([, a, b]) => contrast(a, b) < 4.5);
    const el = $('#contrast');
    el.textContent = weak.length ? `⚠ تباين ضعيف: ${weak.map((p) => p[0]).join('، ')}` : '✓ التباين جيد للقراءة';
    el.style.color = weak.length ? '#FACC15' : 'var(--brand)';
  }

  /* يغيّر لونًا واحدًا ثم يعيد الرسم */
  function setColor(id, value) {
    if (!HEX.test(value)) return false;
    state.colors[id] = value.toUpperCase();
    render();
    return true;
  }


  /* ---------- 3. بناء الحقول وربطها ---------- */
  function buildFields() {
    FIELDS.forEach((f) => {
      const host = $(`.fields[data-group="${f.group}"]`);
      host.insertAdjacentHTML('beforeend', `
        <div class="field-row" data-field="${f.id}">
          <label for="c-${f.id}">${f.label}</label>
          <input type="color" id="c-${f.id}" aria-label="${f.label}">
          <input type="text" dir="ltr" maxlength="9" spellcheck="false" aria-label="${f.label} (رمز اللون)">
        </div>`);
      const row = host.lastElementChild;
      // أداة اختيار اللون: تحديث فوري أثناء السحب
      $('input[type=color]', row).addEventListener('input', (e) => setColor(f.id, e.target.value));
      // حقل الرمز: يقبل #RRGGBB، ويلوّن الحد بالأحمر إن كان الرمز غير صالح
      const text = $('input[type=text]', row);
      text.addEventListener('input', () => {
        let v = text.value.trim(); if (v && v[0] !== '#') v = '#' + v;
        text.classList.toggle('invalid', !setColor(f.id, v));
      });
      text.addEventListener('blur', () => { text.classList.remove('invalid'); text.value = state.colors[f.id]; });
    });

    $('#presets').innerHTML = PRESETS.map((p, i) =>
      `<button class="preset" data-preset="${i}"><i style="background:${p.swatch}"></i>${p.name}</button>`).join('');
    $$('#presets .preset').forEach((b) => b.addEventListener('click', () => {
      Object.assign(state.colors, PRESETS[b.dataset.preset].values);
      render();
    }));
  }


  /* ---------- 4. الشعار ----------
     أي صورة (PNG/JPG/WebP/SVG) تُرسم داخل مربع 256×256 مع الحفاظ على
     نسبتها، ثم تُحفظ PNG. لماذا؟ لأن الأداة (WPF) تقرأ PNG فقط، والحجم
     الصغير يبقي winutil.ps1 خفيفًا.                                    */
  function loadLogo(file) {
    if (!file || !file.type.startsWith('image/')) return toast('اختر ملف صورة');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = LOGO_SIZE;
      const ctx = canvas.getContext('2d');
      const scale = Math.min(LOGO_SIZE / (img.naturalWidth || LOGO_SIZE), LOGO_SIZE / (img.naturalHeight || LOGO_SIZE));
      const w = (img.naturalWidth || LOGO_SIZE) * scale, h = (img.naturalHeight || LOGO_SIZE) * scale;
      ctx.drawImage(img, (LOGO_SIZE - w) / 2, (LOGO_SIZE - h) / 2, w, h);
      URL.revokeObjectURL(url);
      const data = canvas.toDataURL('image/png');
      if (atob(data.split(',')[1]).length > MAX_LOGO_BYTES) return toast('الصورة كبيرة جدًا بعد التحويل، جرّب صورة أبسط');
      state.logoImage = data;
      render();
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('تعذّر قراءة الصورة'); };
    img.src = url;
  }

  function initLogo() {
    thumbPlaceholder = $('#logoThumb').innerHTML;
    const input = $('#logoInput'), drop = $('#drop');
    input.addEventListener('change', () => loadLogo(input.files[0]));
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => loadLogo(e.dataTransfer.files[0]));
    $('#logoRemove').addEventListener('click', () => {
      state.logoImage = null; input.value = '';
      render();
    });
  }


  /* ---------- 5. التحميل من GitHub ----------
     يقرأ brand.json الحالي من المستودع (بلا رمز، القراءة عامة)،
     فتبدأ اللوحة من آخر هوية محفوظة لا من القيم الافتراضية.            */
  function brandToColors(brand) {
    const colors = { ...DEFAULTS };
    FIELDS.forEach((f) => {
      const v = f.logo ? brand.logo?.[f.logo] : brand.colors?.[f.keys[0]];
      if (v && HEX.test(v)) colors[f.id] = v.toUpperCase();
    });
    return colors;
  }

  async function loadFromGitHub() {
    const status = $('#loadStatus');
    try {
      // raw.githubusercontent.com بدل api.github.com: لا حد لعدد الطلبات للزوار بلا رمز
      const res = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${BRAND_PATH}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const brand = await res.json();
      state.remoteBrand = brand;
      state.colors = brandToColors(brand);
      if (brand.logoImage) {
        state.remoteHasLogo = true;
        const img = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${LOGO_PATH}?t=${Date.now()}`);
        if (img.ok) state.logoImage = await blobToDataURL(await img.blob());
      }
      status.innerHTML = '<span>✓ حُمِّلت الهوية الحالية من المستودع</span>';
      status.classList.add('ok');
    } catch (e) {
      status.innerHTML = '<span>تعذّر التحميل من GitHub، بدأنا بالألوان الافتراضية</span>';
      status.classList.add('warn');
    }
    saved = snapshot();
    render();
  }

  const blobToDataURL = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });


  /* ---------- 6. التصدير والتراجع ---------- */

  /* تبني brand.json بالشكل الذي يقرؤه tools/Apply-Brand.ps1 */
  function buildBrandJson() {
    const brand = {
      version: 1,
      theme: 'Dark',
      colors: {},
      logo: {},
      logoImage: state.logoImage ? LOGO_PATH : null,
    };
    FIELDS.forEach((f) => {
      if (f.logo) brand.logo[f.logo] = state.colors[f.id];
      else f.keys.forEach((k) => { brand.colors[k] = state.colors[f.id]; });
    });
    return JSON.stringify(brand, null, 2) + '\n';
  }

  function initExportReset() {
    $('#exportBtn').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buildBrandJson()], { type: 'application/json' }));
      a.download = 'brand.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('#resetBtn').addEventListener('click', () => {
      const s = JSON.parse(saved);
      state.colors = { ...s.c }; state.logoImage = s.l;
      render();
    });
    // تحذير قبل مغادرة الصفحة بتغييرات غير محفوظة
    addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  }


  /* ---------- 7. عميل GitHub API ----------
     كل الطلبات تمر من هذه الدالة: تضيف الرمز والترويسات، وتحوّل
     الأخطاء إلى رسائل عربية مفهومة.                                   */
  function github(token) {
    return async (method, path, body) => {
      const res = await fetch(`https://api.github.com${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) return res.status === 204 ? null : res.json();
      const msg = (await res.json().catch(() => ({}))).message || '';
      const err = new Error({
        401: 'الرمز غير صحيح أو منتهي الصلاحية.',
        403: 'الرمز لا يملك صلاحية كافية على هذا المستودع.',
        404: 'المستودع أو الفرع غير موجود، أو الرمز لا يصل إليه.',
        409: 'المستودع فارغ أو في حالة تعارض.',
        422: 'رفض GitHub التحديث: ' + msg,
      }[res.status] || `خطأ من GitHub (${res.status}): ${msg}`);
      err.status = res.status;
      throw err;
    };
  }

  /* commit واحد يحتوي brand.json والشعار معًا (Git Data API):
     ref → commit → tree → blobs → tree جديد → commit جديد → تحريك ref.
     لماذا لا نستخدم Contents API الأبسط؟ لأنه يصنع commit لكل ملف،
     فيعمل البناء مرتين ويرى في المرة الأولى نصف التغيير.              */
  async function commitBrand(api, repo, branch, message) {
    const ref = await api('GET', `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
    const parent = await api('GET', `/repos/${repo}/git/commits/${ref.object.sha}`);

    const tree = [];
    const brandBlob = await api('POST', `/repos/${repo}/git/blobs`, { content: buildBrandJson(), encoding: 'utf-8' });
    tree.push({ path: BRAND_PATH, mode: '100644', type: 'blob', sha: brandBlob.sha });

    if (state.logoImage) {
      const logoBlob = await api('POST', `/repos/${repo}/git/blobs`, { content: state.logoImage.split(',')[1], encoding: 'base64' });
      tree.push({ path: LOGO_PATH, mode: '100644', type: 'blob', sha: logoBlob.sha });
    } else if (state.remoteHasLogo) {
      tree.push({ path: LOGO_PATH, mode: '100644', type: 'blob', sha: null });   // sha: null = حذف الملف
    }

    const newTree = await api('POST', `/repos/${repo}/git/trees`, { base_tree: parent.tree.sha, tree });
    const commit = await api('POST', `/repos/${repo}/git/commits`, { message, tree: newTree.sha, parents: [parent.sha] });
    // force: false — إن تغيّر الفرع أثناء الحفظ يرفض GitHub بدل أن يمسح عمل غيرك
    await api('PATCH', `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.sha, force: false });
    return commit;
  }


  /* ---------- 8. الحفظ وتتبّع البناء ---------- */
  function step(name, status, note) {
    const li = $(`#pipeline [data-step="${name}"]`);
    li.className = status;   // active | done | error
    if (note !== undefined) $('span', li).innerHTML = note;
  }

  /* يراقب تشغيل GitHub Actions الذي بدأه الـ commit، كل 6 ثوانٍ لمدة 6 دقائق */
  async function trackBuild(api, repo, sha) {
    const runsUrl = `https://github.com/${repo}/actions/workflows/brand-rebuild.yaml`;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 6000));
      let data;
      try { data = await api('GET', `/repos/${repo}/actions/runs?head_sha=${sha}&per_page=10`); }
      catch (e) {
        // رمز بلا صلاحية Actions: نكتفي برابط المتابعة
        step('build', 'done', `تابع البناء من <a href="${runsUrl}" target="_blank" rel="noopener">صفحة Actions</a>`);
        step('live', '', 'يظهر بعد انتهاء البناء (دقيقتان تقريبًا)');
        return;
      }
      const run = (data.workflow_runs || []).find((r) => r.path?.endsWith('brand-rebuild.yaml'));
      if (!run) {
        if (i === 10) step('build', 'active', `لم يبدأ البناء بعد. هل GitHub Actions مفعّلة؟ <a href="https://github.com/${repo}/actions" target="_blank" rel="noopener">افتح Actions</a>`);
        continue;
      }
      if (run.status !== 'completed') { step('build', 'active', `جارٍ البناء… <a href="${run.html_url}" target="_blank" rel="noopener">السجل</a>`); continue; }
      if (run.conclusion === 'success') {
        step('build', 'done', `<a href="${run.html_url}" target="_blank" rel="noopener">اكتمل البناء</a>`);
        step('live', 'done', 'النسخة الجديدة متاحة الآن عبر أمر التشغيل');
        toast('تم النشر ✓');
      } else {
        step('build', 'error', `فشل البناء — <a href="${run.html_url}" target="_blank" rel="noopener">اقرأ السجل</a>`);
      }
      return;
    }
    step('build', 'active', `يستغرق وقتًا أطول من المعتاد — <a href="${runsUrl}" target="_blank" rel="noopener">تابع هنا</a>`);
  }

  function initSave() {
    const dlg = $('#saveDialog'), form = $('#saveForm'), err = $('#formError');
    $('#repoInput').value = REPO;
    try { $('#tokenInput').value = sessionStorage.getItem('gh_token') || ''; $('#rememberInput').checked = !!sessionStorage.getItem('gh_token'); } catch (e) {}

    $('#saveBtn').addEventListener('click', () => { err.hidden = true; dlg.showModal(); });

    form.addEventListener('submit', async (e) => {
      if (e.submitter?.value === 'cancel') return;          // «إلغاء» يغلق النافذة فقط
      e.preventDefault();
      const token = $('#tokenInput').value.trim();
      const repo = $('#repoInput').value.trim();
      const branch = $('#branchInput').value.trim();
      const message = $('#msgInput').value.trim() || 'تحديث الهوية البصرية';
      const btn = $('#confirmSave');
      btn.disabled = true; err.hidden = true;

      const api = github(token);
      try {
        // تحقق مبكر: هل يستطيع هذا الرمز الكتابة في المستودع؟
        const info = await api('GET', `/repos/${repo}`);
        if (info.permissions && !info.permissions.push) throw new Error('هذا الرمز يقرأ المستودع فقط ولا يكتب فيه. فعّل صلاحية Contents: Read and write.');

        try { $('#rememberInput').checked ? sessionStorage.setItem('gh_token', token) : sessionStorage.removeItem('gh_token'); } catch (e2) {}
        dlg.close();

        $('#pipeline').hidden = false;
        $$('#pipeline li').forEach((li) => { li.className = ''; });
        step('commit', 'active', 'جارٍ الحفظ…');
        const commit = await commitBrand(api, repo, branch, message);
        step('commit', 'done', `<a href="${commit.html_url}" target="_blank" rel="noopener">${commit.sha.slice(0, 7)}</a> على فرع ${branch}`);

        // صار المحفوظ هو الحالي
        state.remoteHasLogo = !!state.logoImage;
        saved = snapshot(); render();

        step('build', 'active', 'بانتظار GitHub Actions…');
        trackBuild(api, repo, commit.sha);
      } catch (e3) {
        if (dlg.open) { err.textContent = e3.message; err.hidden = false; }
        else { step('commit', 'error', e3.message); }
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* الإشعار المشترك من main.js (#toast) */
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
  }


  /* ---------- 9. التشغيل ---------- */
  initLogo();
  buildFields();
  initExportReset();
  initSave();
  render();
  loadFromGitHub();
})();
