#===========================================================================
# Tests - Selected tweaks counter beside the Apply button
#===========================================================================

BeforeAll {
    $script:repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    . (Join-Path $script:repoRoot "functions\private\Update-WinUtilTweakCount.ps1")
}

Describe "Update-WinUtilTweakCount" {
    It "uses the right Arabic form for <Count>" -ForEach @(
        @{ Count = 0; Expected = "لم تحدد أي تحسين بعد" }
        @{ Count = 1; Expected = "سيُطبَّق تحسين واحد" }
        @{ Count = 2; Expected = "سيُطبَّق تحسينان" }
        @{ Count = 7; Expected = "سيُطبَّق 7 تحسينات" }
        @{ Count = 10; Expected = "سيُطبَّق 10 تحسينات" }
        @{ Count = 13; Expected = "سيُطبَّق 13 تحسينًا" }
    ) {
        $script:sync = $null
        Update-WinUtilTweakCount -Count $Count | Should -Be $Expected
    }

    It "counts the current selection and writes it to the label" {
        $label = [pscustomobject]@{ Text = "" }
        $script:sync = @{
            selectedTweaks = [System.Collections.Generic.List[string]]@("WPFTweaksTelemetry", "WPFTweaksLocation", "WPFTweaksActivity")
            WPFTweaksSelectionCount = $label
        }

        Update-WinUtilTweakCount | Out-Null

        $label.Text | Should -Be "سيُطبَّق 3 تحسينات"
    }
}
