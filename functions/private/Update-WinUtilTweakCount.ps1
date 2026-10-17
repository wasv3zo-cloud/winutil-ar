function Update-WinUtilTweakCount {
    <#
        .SYNOPSIS
            Shows how many tweaks the Apply button will run, next to it in the Tweaks tab

        .DESCRIPTION
            "تطبيق التحسينات" alone does not say what is about to happen. The line beside it
            reads "سيُطبَّق 7 تحسينات" so the user sees the size of the change before applying.
            Toggles are left out: they take effect the moment they are switched.

            Returns the text, and writes it to the WPFTweaksSelectionCount TextBlock when the
            window exists.

        .PARAMETER Count
            The number of selected tweaks. Defaults to $sync.selectedTweaks.Count.
    #>
    param(
        [Nullable[int]]$Count = $null
    )

    if ($null -eq $Count) {
        $Count = @($sync.selectedTweaks).Where({ $null -ne $_ }).Count
    }

    # Arabic number agreement: 1 تحسين واحد، 2 تحسينان، 3–10 تحسينات، 11 وأكثر تحسينًا
    $text = switch ($Count) {
        0 { "لم تحدد أي تحسين بعد" }
        1 { "سيُطبَّق تحسين واحد" }
        2 { "سيُطبَّق تحسينان" }
        { $_ -ge 3 -and $_ -le 10 } { "سيُطبَّق $Count تحسينات"; break }
        default { "سيُطبَّق $Count تحسينًا" }
    }

    if ($null -ne $sync -and $null -ne $sync.WPFTweaksSelectionCount) {
        $sync.WPFTweaksSelectionCount.Text = $text
    }
    $text
}
