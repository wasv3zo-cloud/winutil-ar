#===========================================================================
# Tests - Collapsible Tweaks category headers
#===========================================================================

BeforeAll {
    $script:repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

    if (-not ("Windows.Visibility" -as [type])) {
        Add-Type "namespace Windows { public enum Visibility { Visible, Collapsed } }"
    }
    # Own namespace so these stubs never collide with the WPF stubs other test files add;
    # the function recognises headers and checkboxes by type name, as WPF names them.
    if (-not ("WinUtilCollapseTest.Label" -as [type])) {
        Add-Type "namespace WinUtilCollapseTest { public class Label { public object Tag { get; set; } public object Parent { get; set; } public object Visibility { get; set; } } public class CheckBox { public bool? IsChecked { get; set; } } }"
    }

    . (Join-Path $script:repoRoot "functions\private\Set-WinUtilCategoryCollapsed.ps1")

    function script:New-Entry {
        param([bool]$Checked = $false)
        $box = New-Object WinUtilCollapseTest.CheckBox
        $box.IsChecked = $Checked
        [pscustomobject]@{ Children = @($box); Visibility = [Windows.Visibility]::Visible }
    }

    function script:New-Section {
        param([object[]]$Entries, [object[]]$After = @())
        $panel = [pscustomobject]@{ Children = [System.Collections.ArrayList]::new() }
        $header = New-Object WinUtilCollapseTest.Label
        $header.Parent = $panel
        $header.Tag = @{ Collapsed = $true; Arrow = [pscustomobject]@{ Text = "" } }
        $null = $panel.Children.Add($header)
        foreach ($entry in $Entries) { $null = $panel.Children.Add($entry) }
        foreach ($entry in $After) { $null = $panel.Children.Add($entry) }
        $header
    }
}

Describe "Set-WinUtilCategoryCollapsed" {
    It "hides the entries under the header and shows their count" {
        $entries = @((New-Entry), (New-Entry))
        $header = New-Section -Entries $entries

        Set-WinUtilCategoryCollapsed -Label $header -Collapsed $true

        $entries | ForEach-Object { $_.Visibility | Should -Be ([Windows.Visibility]::Collapsed) }
        $header.Tag.Arrow.Text | Should -BeLike "*(2)*"
    }

    It "shows the entries again when expanded" {
        $entries = @((New-Entry))
        $header = New-Section -Entries $entries
        Set-WinUtilCategoryCollapsed -Label $header -Collapsed $true

        Set-WinUtilCategoryCollapsed -Label $header -Collapsed $false

        $entries[0].Visibility | Should -Be ([Windows.Visibility]::Visible)
        $header.Tag.Collapsed | Should -BeFalse
    }

    It "stops at the next category header" {
        $mine = New-Entry
        $nextHeader = New-Object WinUtilCollapseTest.Label
        $nextHeader.Visibility = [Windows.Visibility]::Visible
        $theirs = New-Entry
        $header = New-Section -Entries @($mine) -After @($nextHeader, $theirs)

        Set-WinUtilCategoryCollapsed -Label $header -Collapsed $true

        $mine.Visibility | Should -Be ([Windows.Visibility]::Collapsed)
        $nextHeader.Visibility | Should -Be ([Windows.Visibility]::Visible)
        $theirs.Visibility | Should -Be ([Windows.Visibility]::Visible)
    }

    It "stays open when a ticked entry would be hidden" {
        $entries = @((New-Entry), (New-Entry -Checked $true))
        $header = New-Section -Entries $entries

        Set-WinUtilCategoryCollapsed -Label $header -Collapsed $true -ExpandIfSelected

        $header.Tag.Collapsed | Should -BeFalse
        $entries | ForEach-Object { $_.Visibility | Should -Be ([Windows.Visibility]::Visible) }
    }
}
