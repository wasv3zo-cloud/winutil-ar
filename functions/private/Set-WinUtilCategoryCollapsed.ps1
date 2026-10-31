function Set-WinUtilCategoryCollapsed {
    <#
        .SYNOPSIS
            Shows or hides the entries under a collapsible Tweaks category header

        .DESCRIPTION
            The entries of a category are the siblings that follow its header Label in the
            same panel, up to the next Label. Walking the panel rather than keeping a list
            means entries added later (lazy tab building) are covered too.

            The header keeps its state in Label.Tag (Collapsed, Arrow, Count) so the empty
            search reset in Find-TweaksByNameOrDescription can leave a collapsed category
            collapsed.

        .PARAMETER Label
            The category header Label created by Invoke-WPFUIElements.

        .PARAMETER Collapsed
            $true hides the entries, $false shows them.

        .PARAMETER ExpandIfSelected
            Open the category anyway when one of its entries is ticked, so a preset never
            selects tweaks the user cannot see.
    #>
    param(
        [Parameter(Mandatory)]
        $Label,

        [Parameter(Mandatory)]
        [bool]$Collapsed,

        [switch]$ExpandIfSelected
    )

    $panel = $Label.Parent
    if ($null -eq $panel -or $null -eq $Label.Tag) {
        return
    }

    # The entries under this header: siblings up to the next header
    $entries = [System.Collections.Generic.List[object]]::new()
    $afterHeader = $false
    foreach ($child in @($panel.Children)) {
        if ([object]::ReferenceEquals($child, $Label)) {
            $afterHeader = $true
            continue
        }
        if (-not $afterHeader) {
            continue
        }
        if ($child.GetType().Name -eq "Label") {
            break
        }
        $entries.Add($child)
    }

    if ($Collapsed -and $ExpandIfSelected) {
        foreach ($entry in $entries) {
            $box = if ($entry.PSObject.Properties['Children']) { @($entry.Children) | Where-Object { $_.GetType().Name -eq "CheckBox" } | Select-Object -First 1 }
            if ($null -ne $box -and $box.IsChecked -eq $true) {
                $Collapsed = $false
                break
            }
        }
    }

    $Label.Tag.Collapsed = $Collapsed
    $visibility = if ($Collapsed) { [Windows.Visibility]::Collapsed } else { [Windows.Visibility]::Visible }
    foreach ($entry in $entries) {
        $entry.Visibility = $visibility
    }
    $count = $entries.Count

    if ($null -ne $Label.Tag.Arrow) {
        $Label.Tag.Arrow.Text = if ($Collapsed) { "▸ اضغط للعرض ($count)" } else { "▾ إخفاء" }
    }
}
