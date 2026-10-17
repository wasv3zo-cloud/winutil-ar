#!/usr/bin/env python3
"""
build_site.py — يولّد الصفحات التلقائية في موقع WinUtil العربي (فرع gh-pages).

يقرأ ملفات الأداة نفسها، فيبقى الموقع مطابقًا لها دائمًا:
  config/tweaks.json        -> /tweaks/ و /tweaks/<slug>/
  config/applications.json  -> /apps/ و /apps/<key>/ و assets/data/apps.json (لمنشئ الإعداد)
  config/preset.json        -> شارات «ضمن الإعداد القياسي» + assets/data/presets.json
  git log                   -> /changelog/
  winutil.ps1 (المبني)      -> assets/data/build.json (الإصدار + بصمة SHA256)
  كل ما سبق                 -> assets/data/search.json و sitemap.xml و robots.txt

لا يلمس الصفحات المكتوبة يدويًا (الرئيسية، الدليل…). يُشغَّل من
.github/workflows/brand-rebuild.yaml بعد بناء الأداة.

الاستخدام:
  python3 tools/site/build_site.py --out ../site --winutil winutil.ps1
"""
import argparse
import datetime as dt
import hashlib
import html
import json
import re
import shutil
import subprocess
from pathlib import Path

SITE_URL = "https://wasv3zo-cloud.github.io/winutil-ar/"
REPO_URL = "https://github.com/wasv3zo-cloud/winutil-ar"
ROOT = Path(__file__).resolve().parents[2]
E = html.escape

# مستوى الخطورة حسب فئة التحسين في tweaks.json
RISK = {
    "Essential Tweaks": ("safe", "آمن"),
    "Customize Preferences": ("pref", "تفضيل شخصي"),
    "z__Advanced Tweaks - CAUTION": ("adv", "متقدم — انتبه"),
    "Performance Plans - NOT FOR LAPTOPS": ("warn", "ليس للحواسيب المحمولة"),
}
PRESET_AR = {"Standard": "قياسي", "Minimal": "أساسي", "Advanced": "متقدم"}


def load_json(name):
    # strict=False: بعض الأوصاف تحتوي أسطرًا داخل النص
    return json.loads((ROOT / "config" / name).read_text(encoding="utf-8-sig"), strict=False)


def category_names():
    """يقرأ ترجمات الفئات من Get-WinUtilCategoryDisplayName.ps1 حتى لا تتكرر في مكانين."""
    text = (ROOT / "functions/private/Get-WinUtilCategoryDisplayName.ps1").read_text(encoding="utf-8-sig")
    return dict(re.findall(r'^\s*"([^"]+)"\s*=\s*"([^"]+)"', text, re.M))


def slug_of(key, tweak):
    """الرابط يأخذ آخر جزء من رابط التوثيق الأصلي (activity، hiber…) ليبقى قصيرًا وثابتًا."""
    link = tweak.get("link", "")
    if link:
        return link.rstrip("/").rsplit("/", 1)[-1].lower()
    return re.sub(r"^WPF(Tweaks|Toggle)?", "", key).lower()


# ---------------------------------------------------------------- القوالب
def page(title, desc, depth, path, body, scripts=""):
    """صفحة كاملة بنفس رأس وتذييل الصفحات اليدوية. depth = عمق المجلد عن الجذر."""
    root = "../" * depth
    return f"""<!doctype html>
<html lang="ar" dir="rtl" data-root="{root}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{E(title)}</title>
  <meta name="description" content="{E(desc)}">
  <link rel="canonical" href="{SITE_URL}{path}">
  <meta property="og:title" content="{E(title)}">
  <meta property="og:description" content="{E(desc)}">
  <meta property="og:image" content="{SITE_URL}img/2-tweaks.jpg">
  <meta name="theme-color" content="#07140D">
  <link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Noto+Kufi+Arabic:wght@600;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{root}assets/css/style.css">
  <link rel="stylesheet" href="{root}assets/css/brand.css">
  <script>try{{if(localStorage.getItem('theme')==='light')document.documentElement.dataset.theme='light'}}catch(e){{}}</script>
</head>
<body>
<a class="skip" href="#main">تخطَّ إلى المحتوى</a>
<header id="site-header"></header>
<main id="main">
{body}
</main>
<footer id="site-footer"></footer>
<script src="{root}assets/js/config.js"></script>
<script src="{root}assets/js/main.js"></script>
{scripts}
</body>
</html>
"""


def hero(crumbs, title, lead):
    links = " / ".join(crumbs)
    return f"""  <section class="page-hero">
    <div class="wrap">
      <div class="crumbs">{links}</div>
      <h1 class="h1" style="font-size:clamp(28px,4.6vw,46px)">{title}</h1>
      <p class="lead" style="margin:14px auto 0">{lead}</p>
    </div>
  </section>"""


def write(out, rel, text):
    target = out / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


# ---------------------------------------------------------------- التحسينات
def tweak_changes(t):
    """قائمة مقروءة بما يغيّره التحسين فعلًا في النظام."""
    rows = []
    for r in t.get("registry", []) or []:
        rows.append(("السجل", f"{r.get('Path','')}\\{r.get('Name','')}", str(r.get("Value", "")), str(r.get("OriginalValue", ""))))
    for s in t.get("service", []) or []:
        rows.append(("خدمة", s.get("Name", ""), s.get("StartupType", ""), s.get("OriginalType", "")))
    return rows


def build_tweaks(out, tweaks, cats, presets):
    in_preset = {}
    for name, keys in presets.items():
        for k in keys:
            in_preset.setdefault(k, []).append(name)

    items = []
    for key, t in tweaks.items():
        if t.get("Type") in ("Button", "Combobox"):
            continue  # أزرار وقوائم، ليست تحسينات تُطبَّق بخانة
        slug = slug_of(key, t)
        cat = t.get("category", "")
        risk_cls, risk_txt = RISK.get(cat, ("pref", "تفضيل"))
        items.append({
            "key": key, "slug": slug, "title": t.get("Content", key), "desc": t.get("Description", ""),
            "cat": cats.get(re.sub(r"^.*__", "", cat), cats.get(cat, cat)), "risk": risk_cls, "riskText": risk_txt,
            "toggle": t.get("Type") == "Toggle", "undo": bool(t.get("UndoScript") or t.get("registry") or t.get("service")),
            "presets": [PRESET_AR.get(p, p) for p in in_preset.get(key, []) if p in PRESET_AR],
            "changes": tweak_changes(t), "script": bool(t.get("InvokeScript")),
        })

    # صفحة لكل تحسين
    for it in items:
        badges = f'<span class="badge-risk {it["risk"]}">{it["riskText"]}</span>'
        badges += "".join(f'<span class="tag">ضمن «{p}»</span>' for p in it["presets"])
        if it["toggle"]:
            badges += '<span class="tag">مفتاح تشغيل/إيقاف</span>'
        changes = ""
        if it["changes"]:
            rows = "".join(f'<tr><td>{E(a)}</td><td><code dir="ltr">{E(b)}</code></td><td><code dir="ltr">{E(c)}</code></td><td><code dir="ltr">{E(d)}</code></td></tr>' for a, b, c, d in it["changes"])
            changes = f"""<h2 class="h3 mt-l">ماذا يغيّر في جهازك؟</h2>
      <div class="table-wrap mt-s"><table class="table"><thead><tr><th>النوع</th><th>المكان</th><th>القيمة الجديدة</th><th>القيمة الأصلية</th></tr></thead><tbody>{rows}</tbody></table></div>"""
        if it["script"]:
            changes += '<p class="muted small mt-s">ويشغّل أيضًا أوامر PowerShell، تجدها كاملة في <a href="' + REPO_URL + '/blob/main/config/tweaks.json" target="_blank" rel="noopener">ملف التحسينات</a>.</p>'
        undo = ("يمكنك التراجع عنه من الأداة: حدّده ثم اضغط «التراجع عن التحسينات المحددة»." if it["undo"] and not it["toggle"]
                else "أطفئ المفتاح في الأداة ليعود كما كان." if it["toggle"] else "لا يوجد تراجع تلقائي؛ استخدم نقطة استعادة.")
        body = hero(['<a href="../../">الرئيسية</a>', '<a href="../">مكتبة التحسينات</a>', E(it["cat"])], E(it["title"]), E(it["desc"]) or "&nbsp;") + f"""
  <section class="section section--tight" style="padding-top:0">
    <div class="wrap narrow">
      <div class="badges">{badges}</div>
      {changes}
      <h2 class="h3 mt-l">التراجع</h2>
      <p class="muted">{undo}</p>
      <div class="callout callout--tip"><i data-icon="info"></i><div>أين تجده؟ افتح الأداة ← تبويب <b>التحسينات</b> ← قسم <b>{E(it["cat"])}</b>.</div></div>
      <div class="btn-row mt-l"><a class="btn btn--primary" href="../../#run"><i data-icon="terminal"></i>شغّل الأداة</a><a class="btn btn--ghost" href="../">كل التحسينات</a></div>
    </div>
  </section>"""
        write(out, f"tweaks/{it['slug']}/index.html",
              page(f"{it['title']} — WinUtil العربي", it["desc"] or it["title"], 2, f"tweaks/{it['slug']}/", body))

    # صفحة الفهرس
    groups = {}
    for it in items:
        groups.setdefault(it["cat"], []).append(it)
    sections = ""
    for cat, lst in groups.items():
        cards = "".join(
            f'<a class="lib-card" href="{it["slug"]}/" data-filter="{E(it["title"] + " " + it["desc"])}"><span class="badge-risk {it["risk"]}">{it["riskText"]}</span>'
            f'<b>{E(it["title"])}</b><span>{E(it["desc"][:110])}</span></a>' for it in lst)
        sections += f'<h2 class="h3 mt-l lib-group">{E(cat)} <span class="muted small">({len(lst)})</span></h2><div class="lib-grid">{cards}</div>'
    body = hero(['<a href="../">الرئيسية</a>', "مكتبة التحسينات"], 'مكتبة <span class="hl">التحسينات</span>',
                f"{len(items)} تحسينًا، لكل واحد صفحة تشرح ما يفعله وما يغيّره وكيف تتراجع عنه.") + f"""
  <section class="section section--tight" style="padding-top:0">
    <div class="wrap">
      <div class="search"><i data-icon="search"></i><input id="libFilter" type="search" placeholder="ابحث في التحسينات…" aria-label="ابحث في التحسينات"></div>
      <div class="legend"><span class="badge-risk safe">آمن</span><span class="badge-risk pref">تفضيل شخصي</span><span class="badge-risk adv">متقدم — انتبه</span><span class="badge-risk warn">ليس للمحمول</span></div>
      {sections}
      <p class="empty" id="libEmpty">لا توجد نتائج.</p>
    </div>
  </section>"""
    write(out, "tweaks/index.html", page("مكتبة التحسينات — WinUtil العربي", "كل تحسينات ويندوز في أداة WinUtil العربي مشروحة بالعربية.", 1, "tweaks/", body))
    return items


# ---------------------------------------------------------------- البرامج
def build_apps(out, apps, cats):
    items = []
    for key, a in apps.items():
        items.append({"key": key, "id": "WPFInstall" + key, "name": a.get("content", key), "desc": a.get("description", ""),
                      "cat": cats.get(a.get("category", ""), a.get("category", "")), "foss": bool(a.get("foss")),
                      "link": a.get("link", ""), "winget": a.get("winget", ""), "choco": a.get("choco", "")})
    items.sort(key=lambda x: (x["cat"], x["name"].lower()))

    for it in items:
        src = "".join(f'<tr><td>{n}</td><td><code dir="ltr">{E(v)}</code></td></tr>' for n, v in (("WinGet", it["winget"]), ("Chocolatey", it["choco"])) if v and v != "na")
        badges = ('<span class="badge-risk safe">مفتوح المصدر</span>' if it["foss"] else "") + f'<span class="tag">{E(it["cat"])}</span>'
        body = hero(['<a href="../../">الرئيسية</a>', '<a href="../">البرامج</a>', E(it["cat"])], E(it["name"]), E(it["desc"]) or "&nbsp;") + f"""
  <section class="section section--tight" style="padding-top:0">
    <div class="wrap narrow">
      <div class="badges">{badges}</div>
      <h2 class="h3 mt-l">طريقة التثبيت</h2>
      <p class="muted">افتح الأداة ← تبويب <b>التثبيت</b> ← ابحث عن «{E(it["name"])}» وحدّده ← «تثبيت المحدد». يُحمَّل من مصدره الرسمي.</p>
      {f'<div class="table-wrap mt-s"><table class="table"><tbody>{src}</tbody></table></div>' if src else ''}
      <div class="btn-row mt-l"><a class="btn btn--primary" href="../../build/?add={E(it["key"])}"><i data-icon="box"></i>أضفه إلى إعدادي</a>{f'<a class="btn btn--ghost" href="{E(it["link"])}" target="_blank" rel="noopener">الموقع الرسمي</a>' if it["link"] else ''}</div>
    </div>
  </section>"""
        write(out, f"apps/{it['key']}/index.html", page(f"تثبيت {it['name']} — WinUtil العربي", it["desc"] or it["name"], 2, f"apps/{it['key']}/", body))

    groups = {}
    for it in items:
        groups.setdefault(it["cat"], []).append(it)
    sections = "".join(
        f'<h2 class="h3 mt-l lib-group">{E(cat)} <span class="muted small">({len(lst)})</span></h2><div class="lib-grid">'
        + "".join(f'<a class="lib-card" href="{it["key"]}/" data-filter="{E(it["name"] + " " + it["desc"])}"><b>{E(it["name"])}</b><span>{E(it["desc"][:90])}</span></a>' for it in lst)
        + "</div>" for cat, lst in groups.items())
    body = hero(['<a href="../">الرئيسية</a>', "البرامج"], 'مكتبة <span class="hl">البرامج</span>',
                f"{len(items)} برنامجًا تثبّتها الأداة من مصادرها الرسمية.") + f"""
  <section class="section section--tight" style="padding-top:0">
    <div class="wrap">
      <div class="search"><i data-icon="search"></i><input id="libFilter" type="search" placeholder="ابحث عن برنامج…" aria-label="ابحث عن برنامج"></div>
      {sections}
      <p class="empty" id="libEmpty">لا توجد نتائج.</p>
    </div>
  </section>"""
    write(out, "apps/index.html", page("البرامج — WinUtil العربي", "كل البرامج التي تثبّتها أداة WinUtil العربي.", 1, "apps/", body))
    return items


# ---------------------------------------------------------------- سجل الإصدارات
AUTO_TAG = ' <span class="tag">تلقائي</span>'


def build_changelog(out):
    fmt = "%h%x1f%ad%x1f%s%x1f%an"
    try:
        log = subprocess.run(["git", "-C", str(ROOT), "log", "-60", "--date=short", f"--pretty=format:{fmt}", "--", "config", "functions", "xaml", "scripts", "branding"],
                             capture_output=True, text=True, check=True).stdout
    except Exception:
        log = ""
    days = {}
    for line in log.splitlines():
        sha, date, subject, author = (line.split("\x1f") + ["", "", "", ""])[:4]
        days.setdefault(date, []).append((sha, subject, author))
    blocks = "".join(
        f'<div class="log-day"><h2 class="h3">{d}</h2><ul>' + "".join(
            f'<li><a href="{REPO_URL}/commit/{s}" target="_blank" rel="noopener"><code>{s}</code></a> {E(m)}{AUTO_TAG if "bot" in a else ""}</li>'
            for s, m, a in lst) + "</ul></div>" for d, lst in days.items())
    body = hero(['<a href="../">الرئيسية</a>', "سجل الإصدارات"], 'سجل <span class="hl">الإصدارات</span>',
                'كل تغيير في الأداة، يُحدَّث تلقائيًا مع كل بناء. <span id="buildInfo"></span>') + f"""
  <section class="section section--tight" style="padding-top:0"><div class="wrap narrow">{blocks or '<p class="muted">لا توجد تغييرات بعد.</p>'}</div></section>"""
    write(out, "changelog/index.html", page("سجل الإصدارات — WinUtil العربي", "آخر التغييرات في أداة WinUtil العربي.", 1, "changelog/", body))


# ---------------------------------------------------------------- البيانات
def build_data(out, winutil, tweaks_items, app_items, presets):
    data = out / "assets/data"
    data.mkdir(parents=True, exist_ok=True)
    build = {"date": dt.date.today().isoformat()}
    if winutil and Path(winutil).exists():
        raw = Path(winutil).read_bytes()
        build["sha256"] = hashlib.sha256(raw).hexdigest().upper()
        build["size"] = len(raw)
        m = re.search(rb"Version\s*:\s*([0-9.]+)", raw[:4000])
        if m:
            build["version"] = m.group(1).decode()
    (data / "build.json").write_text(json.dumps(build, ensure_ascii=False, indent=2), encoding="utf-8")

    (data / "apps.json").write_text(json.dumps(
        [{k: a[k] for k in ("key", "id", "name", "cat", "foss")} for a in app_items], ensure_ascii=False), encoding="utf-8")
    (data / "tweaks.json").write_text(json.dumps(
        [{"id": t["key"], "slug": t["slug"], "title": t["title"], "cat": t["cat"], "risk": t["risk"], "toggle": t["toggle"]} for t in tweaks_items],
        ensure_ascii=False), encoding="utf-8")
    (data / "presets.json").write_text(json.dumps({k: v for k, v in presets.items() if k in PRESET_AR}, ensure_ascii=False), encoding="utf-8")

    pages = [
        ("الرئيسية", "", "أمر التشغيل والمميزات"), ("دليل الاستخدام", "guide/", "خطوة بخطوة بالصور"),
        ("صمّم نسختك", "customize/", "الألوان والشعار"), ("استوديو التصميم", "studio/", "معاينة حية وحفظ في GitHub"),
        ("منشئ الإعداد", "build/", "اختر برامجك وتحسيناتك بأمر واحد"), ("مكتبة التحسينات", "tweaks/", "كل التحسينات مشروحة"),
        ("البرامج", "apps/", "كل البرامج"), ("الأسئلة الشائعة", "faq/", "الأمان والأخطاء"), ("سجل الإصدارات", "changelog/", "آخر التغييرات"),
        ("دليل تعديل الموقع", "cheatsheet/", "تغيير الألوان والنصوص"),
    ]
    search = [{"t": t, "u": u, "d": d, "k": "صفحة"} for t, u, d in pages]
    search += [{"t": t["title"], "u": f"tweaks/{t['slug']}/", "d": t["desc"][:80], "k": "تحسين"} for t in tweaks_items]
    search += [{"t": a["name"], "u": f"apps/{a['key']}/", "d": a["desc"][:80], "k": "برنامج"} for a in app_items]
    (data / "search.json").write_text(json.dumps(search, ensure_ascii=False), encoding="utf-8")

    urls = [u for _, u, _ in pages] + [f"tweaks/{t['slug']}/" for t in tweaks_items] + [f"apps/{a['key']}/" for a in app_items]
    today = dt.date.today().isoformat()
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
        f"  <url><loc>{SITE_URL}{u}</loc><lastmod>{today}</lastmod></url>\n" for u in urls) + "</urlset>\n"
    (out / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}sitemap.xml\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="مجلد الموقع (gh-pages)")
    ap.add_argument("--winutil", default="", help="ملف winutil.ps1 المبني لحساب البصمة")
    args = ap.parse_args()
    out = Path(args.out).resolve()

    # المجلدات المولّدة تُمسح وتُبنى من جديد، فلا تبقى صفحة لتحسين حُذف
    for d in ("tweaks", "apps", "changelog"):
        shutil.rmtree(out / d, ignore_errors=True)

    cats = category_names()
    presets = load_json("preset.json")
    t_items = build_tweaks(out, load_json("tweaks.json"), cats, presets)
    a_items = build_apps(out, load_json("applications.json"), cats)
    build_changelog(out)
    build_data(out, args.winutil, t_items, a_items, presets)
    print(f"site: {len(t_items)} tweaks, {len(a_items)} apps")


if __name__ == "__main__":
    main()
