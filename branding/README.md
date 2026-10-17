# branding

ملفات الهوية البصرية لنسخة WinUtil العربية.

- `brand.json`: الألوان وألوان الشعار، تكتبه صفحة «استوديو التصميم» في الموقع عبر GitHub API.
- `logo.png`: شعار مخصص اختياري (PNG، حتى 300 KB).

عند أي تغيير هنا على فرع `main` يعمل `.github/workflows/brand-rebuild.yaml` تلقائيًا:
يطبّق القيم عبر `tools/Apply-Brand.ps1`، ثم يبني `winutil.ps1` وينشره على فرع `release`،
ولا يغيّر ألوان الموقع ولا شعاره، فهوية الموقع مستقلة.
