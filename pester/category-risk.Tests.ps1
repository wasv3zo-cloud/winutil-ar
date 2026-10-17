#===========================================================================
# Tests - Tweaks category risk badges
#===========================================================================

BeforeAll {
    $script:repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    . (Join-Path $script:repoRoot "functions\private\Get-WinUtilCategoryRisk.ps1")
}

Describe "Get-WinUtilCategoryRisk" {
    It "marks essential tweaks as safe" {
        (Get-WinUtilCategoryRisk -Category "Essential Tweaks").Text | Should -Be "آمن"
    }

    It "marks advanced tweaks as caution in red" {
        $risk = Get-WinUtilCategoryRisk -Category "z__Advanced Tweaks - CAUTION"
        $risk.Text | Should -Be "متقدم — انتبه"
        $risk.Color | Should -Be "#DC2626"
    }

    It "gives every Tweaks category in tweaks.json a badge" {
        $tweaks = Get-Content (Join-Path $script:repoRoot "config\tweaks.json") -Raw -Encoding UTF8 | ConvertFrom-Json
        $categories = $tweaks.PSObject.Properties.Value.category | Sort-Object -Unique
        foreach ($category in $categories) {
            Get-WinUtilCategoryRisk -Category $category | Should -Not -BeNullOrEmpty -Because "category '$category' should have a risk badge"
        }
    }

    It "returns nothing for categories outside the Tweaks tab" {
        Get-WinUtilCategoryRisk -Category "Features" | Should -BeNullOrEmpty
    }

    It "uses valid hex colours" {
        foreach ($category in "Essential Tweaks", "Customize Preferences", "z__Advanced Tweaks - CAUTION", "Performance Plans - NOT FOR LAPTOPS") {
            (Get-WinUtilCategoryRisk -Category $category).Color | Should -Match '^#[0-9A-F]{6}$'
        }
    }
}
