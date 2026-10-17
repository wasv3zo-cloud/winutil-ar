function Get-WinUtilCategoryRisk {
    <#
        .SYNOPSIS
            The risk badge shown next to a Tweaks category header: its Arabic text and colour

        .DESCRIPTION
            Tells a user at a glance which tweaks are safe to apply and which need care,
            before they read every item. Categories outside the Tweaks tab have no badge
            and return $null.

            The colours are mid tones so the badge stays readable on both the dark and the
            light theme; they carry meaning (safe, preference, caution, warning) and are
            deliberately not taken from the theme.

        .PARAMETER Category
            The category key as written in config/tweaks.json, e.g. "Essential Tweaks".
    #>
    param(
        [string]$Category
    )

    switch ($Category) {
        "Essential Tweaks" { @{ Text = "آمن"; Color = "#16A34A" } }
        "Customize Preferences" { @{ Text = "تفضيل شخصي"; Color = "#2563EB" } }
        "z__Advanced Tweaks - CAUTION" { @{ Text = "متقدم — انتبه"; Color = "#DC2626" } }
        "Performance Plans - NOT FOR LAPTOPS" { @{ Text = "ليس للحواسيب المحمولة"; Color = "#D97706" } }
        default { $null }
    }
}
