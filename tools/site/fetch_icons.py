#!/usr/bin/env python3
"""
fetch_icons.py — ينزّل أيقونة لكل برنامج في config/applications.json إلى موقع WinUtil العربي.

تُحفظ الأيقونات داخل الموقع نفسه (assets/img/apps/<key>.png)، فلا يتصل الزائر
بأي خادم خارجي، وتبقى سياسة الأمان (CSP) كما هي: الصور من الموقع فقط.

المصدر:
  - برنامج رابطه على github.com/<المطوّر>/...  -> صورة حساب المطوّر على GitHub
  - غير ذلك                                    -> أيقونة موقعه الرسمي (خدمة أيقونات Google، كما في الأداة)

الأيقونة الموجودة لا تُنزَّل مرة أخرى، فاحذف ملفها لتحديثها.
أي فشل في التنزيل لا يوقف البناء: يعرض الموقع الحرف الأول من اسم البرنامج بدلًا منها.

الاستخدام:
  python3 tools/site/fetch_icons.py --out ../site
"""

import argparse
import json
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote, urlparse

ROOT = Path(__file__).resolve().parents[2]
# تواقيع صيغ الصور المقبولة: PNG وJPEG (صور GitHub غالبًا) وGIF وWebP وICO
IMAGE_MAGIC = (b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff", b"GIF8", b"RIFF", b"\x00\x00\x01\x00")


def icon_urls(link):
    """المصادر بالترتيب: الأول هو المفضّل، والبقية احتياط."""
    u = urlparse(link or "")
    host = u.netloc.lower()
    if not host:
        return []
    parts = [p for p in u.path.split("/") if p]
    if host in ("github.com", "www.github.com") and parts:
        return [f"https://github.com/{parts[0]}.png?size=64"]
    # الطريقة نفسها التي تعرض بها الأداة أيقونات تبويب التثبيت (Initialize-InstallAppEntry.ps1)
    return [f"https://www.google.com/s2/favicons?sz=64&domain_url={quote(link, safe='')}",
            f"https://www.google.com/s2/favicons?sz=64&domain={host}",
            f"https://icons.duckduckgo.com/ip3/{host}.ico"]


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (winutil-ar-site)"})
    with urllib.request.urlopen(req, timeout=15) as r:
        data = r.read(512 * 1024)
    # صورة حقيقية، وليست صفحة خطأ أو أيقونة فارغة
    return data if data.startswith(IMAGE_MAGIC) and len(data) >= 200 else None


def fetch(job):
    key, urls, target = job
    for url in urls:
        for attempt in range(3):          # إعادة المحاولة عند الضغط على الخادم
            try:
                data = download(url)
                if data:
                    target.write_bytes(data)   # المتصفح يتعرّف على الصيغة من محتوى الملف
                    return key, True
                break                          # ردّ لا يحتوي صورة: جرّب المصدر التالي
            except Exception:
                time.sleep(1 + attempt * 2)
    return key, False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="مجلد الموقع (gh-pages)")
    args = ap.parse_args()
    folder = Path(args.out).resolve() / "assets/img/apps"
    folder.mkdir(parents=True, exist_ok=True)

    apps = json.loads((ROOT / "config/applications.json").read_text(encoding="utf-8-sig"), strict=False)
    jobs = []
    for key, a in apps.items():
        target = folder / f"{key}.png"
        urls = icon_urls(a.get("link", ""))
        if urls and not target.exists():
            jobs.append((key, urls, target))

    ok = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for key, good in pool.map(fetch, jobs):
            ok += good
            if not good:
                print(f"no icon: {key}")
    have = len(list(folder.glob("*.png")))
    print(f"icons: {ok} new, {have}/{len(apps)} available")


if __name__ == "__main__":
    main()
