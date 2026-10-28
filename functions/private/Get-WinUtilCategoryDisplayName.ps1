function Get-WinUtilCategoryDisplayName {
    <#
    .SYNOPSIS
        Returns the Arabic display name for a config category.

    .DESCRIPTION
        Category names in the config files are internal keys: they decide sort order,
        are used as $sync keys and are matched by the tweaks state report and the
        install filter chips. They therefore stay in English, and only the text shown
        to the user is translated here.

    .PARAMETER Category
        The raw category key from the config file (prefixes such as "z__" included).
    #>
    param(
        [string]$Category
    )

    $cleanName = $Category -replace ".*__", ""

    $names = @{
        # Install tab
        "Browsers"                              = "المتصفحات"
        "Communications"                        = "التواصل"
        "Development"                           = "التطوير"
        "Document"                              = "المستندات"
        "Games"                                 = "الألعاب"
        "Microsoft Tools"                       = "أدوات مايكروسوفت"
        "Multimedia Tools"                      = "أدوات الوسائط المتعددة"
        "Pro Tools"                             = "أدوات احترافية"
        "Selfhosted Tools"                      = "أدوات الاستضافة الذاتية"
        "Utilities"                             = "الأدوات المساعدة"
        "Package Manager"                       = "مدير الحزم"
        "Selection"                             = "التحديد"
        "Actions"                               = "الإجراءات"
        # Tweaks tab
        "Essential Tweaks"                      = "التحسينات الأساسية"
        "Customize Preferences"                 = "تخصيص التفضيلات"
        "Advanced Tweaks - CAUTION"             = "تحسينات متقدمة - انتبه"
        "Performance Plans - NOT FOR LAPTOPS"   = "خطط الأداء - ليست للحواسيب المحمولة"
        # Config tab
        "Features"                              = "الميزات"
        "Fixes"                                 = "الإصلاحات"
        "Legacy Windows Panels"                 = "لوحات ويندوز الكلاسيكية"
        "Powershell Profile Powershell 7+ Only" = "ملف تعريف PowerShell (لإصدار 7 فما فوق فقط)"
        "Remote Access"                         = "الوصول عن بُعد"
        # AppX tab
        "Bing & Web Services"                   = "Bing وخدمات الويب"
        "Developer Tools"                       = "أدوات المطورين"
        "Microsoft Apps"                        = "تطبيقات مايكروسوفت"
        "Microsoft Ecosystem"                   = "منظومة مايكروسوفت"
        "Utilities & Productivity"              = "الأدوات والإنتاجية"
        "Xbox & Gaming"                         = "Xbox والألعاب"
    }

    if ($names.ContainsKey($cleanName)) {
        return $names[$cleanName]
    }
    return $cleanName
}
