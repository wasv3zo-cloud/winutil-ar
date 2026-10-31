function Test-WinUtilSearchAlias {
    <#
        .SYNOPSIS
            Whether an Arabic search text names the given app, e.g. "كروم" for Chrome

        .DESCRIPTION
            App names in the catalog are in English, so a user typing the Arabic name of an
            app found nothing. This holds the Arabic names people commonly type for the most
            used apps and matches the search text against them.

            Both sides are normalised first: diacritics are removed and the letter forms that
            are often typed interchangeably are unified (أ إ آ -> ا, ة -> ه, ى -> ي), so
            "تيليجرام" and "تلجرام" style spellings are listed once per spelling, not per hamza.

        .PARAMETER SearchString
            The text the user typed in the Install tab search box.

        .PARAMETER AppTag
            The app's checkbox key, such as WPFInstallchrome.
    #>
    param(
        [string]$SearchString,
        [string]$AppTag
    )

    $normalize = {
        param([string]$Text)
        $Text = $Text.ToLowerInvariant() -replace '[ً-ْـ]', ''
        $Text = $Text -replace '[أإآ]', ([string][char]0x0627)
        $Text = $Text -replace 'ة', ([string][char]0x0647)
        $Text -replace 'ى', ([string][char]0x064A)
    }

    $query = (& $normalize $SearchString).Trim()
    if ($query.Length -lt 2 -or [string]::IsNullOrWhiteSpace($AppTag)) {
        return $false
    }

    if ($null -eq $script:WinUtilSearchAliases) {
        # Arabic name -> app keys (without the WPFInstall prefix). Several spellings per app.
        $aliases = @{
            'كروم' = 'chrome'; 'جوجل كروم' = 'chrome'; 'قوقل كروم' = 'chrome'
            'فايرفوكس' = 'firefox'; 'فيرفوكس' = 'firefox'
            'بريف' = 'brave'; 'ايدج' = 'edge'; 'فيفالدي' = 'vivaldi'
            'ديسكورد' = 'discord'; 'دسكورد' = 'discord'
            'تيليجرام' = 'telegram'; 'تلجرام' = 'telegram'; 'تلغرام' = 'telegram'; 'تيليقرام' = 'telegram'
            'واتساب' = 'whatsapp'; 'واتس اب' = 'whatsapp'
            'زوم' = 'zoom'; 'زووم' = 'zoom'; 'تيمز' = 'teams'; 'سلاك' = 'slack'; 'سيجنال' = 'signal'
            'ستيم' = 'steam'; 'ايبك' = 'epicgames'; 'ابيك' = 'epicgames'
            'في ال سي' = 'vlc'; 'فلك' = 'vlc'; 'اوبس' = 'obs'
            'سفن زيب' = '7zip'; 'وين رار' = 'winrar'
            'في اس كود' = 'vscode'; 'فيجوال ستوديو كود' = 'vscode'; 'فيجوال ستوديو' = 'visualstudio2022'
            'بايثون' = 'python3'; 'جيت' = 'git'; 'جت' = 'git'; 'نود' = 'nodejs'; 'دوكر' = 'dockerdesktop'
            'نوتباد' = 'notepadplus'; 'نوت باد' = 'notepadplus'
            'ليبر اوفيس' = 'libreoffice'; 'اوبسيديان' = 'obsidian'; 'ادوبي' = 'adobe'; 'اكروبات' = 'adobe'
            'ثندربيرد' = 'thunderbird'; 'باور تويز' = 'powertoys'; 'افريثينج' = 'everything'
            'كيوبت' = 'qbittorrent'; 'تورنت' = 'qbittorrent'; 'سومطرة' = 'sumatra'
        }
        $script:WinUtilSearchAliases = @{}
        foreach ($term in $aliases.Keys) {
            $script:WinUtilSearchAliases[(& $normalize $term)] = 'WPFInstall' + $aliases[$term]
        }
    }

    foreach ($entry in $script:WinUtilSearchAliases.GetEnumerator()) {
        if ($entry.Value -eq $AppTag -and ($entry.Key.Contains($query) -or $query.Contains($entry.Key))) {
            return $true
        }
    }
    return $false
}
