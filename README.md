# WinUtil بالعربية

الملف المجمّع الجاهز للتشغيل من النسخة العربية. الكود المصدري في الفرع `main`.

شغّل PowerShell كمسؤول ثم نفّذ:

```powershell
iex ([Text.Encoding]::UTF8.GetString((New-Object Net.WebClient).DownloadData('https://raw.githubusercontent.com/wasv3zo-cloud/2219was/release/winutil.ps1')).TrimStart([char]0xFEFF))
```
