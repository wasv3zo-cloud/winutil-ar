#===========================================================================
# Tests - Before/after summary shown when tweaks finish
#===========================================================================

BeforeAll {
    $script:repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    . (Join-Path $script:repoRoot "functions\private\Format-WinUtilTweakReport.ps1")
}

Describe "Format-WinUtilTweakReport" {
    It "shows each measured value before and after with the difference" {
        $before = [pscustomobject]@{ Services = 142; Startup = 9; MemoryMB = 4300 }
        $after = [pscustomobject]@{ Services = 128; Startup = 6; MemoryMB = 4300 }

        $report = Format-WinUtilTweakReport -Before $before -After $after -Applied 12

        $report | Should -BeLike "*(12)*"
        $report | Should -BeLike "*الخدمات العاملة: 142 ← 128 (أقل بـ 14)*"
        $report | Should -BeLike "*برامج بدء التشغيل: 9 ← 6 (أقل بـ 3)*"
        $report | Should -BeLike "*الذاكرة المستخدمة: 4300 ← 4300 ميجابايت (بلا تغيير)*"
    }

    It "shows an increase with a plus sign" {
        $report = Format-WinUtilTweakReport -Before ([pscustomobject]@{ Services = 10 }) -After ([pscustomobject]@{ Services = 12 }) -Applied 1
        $report | Should -BeLike "*10 ← 12 (+2)*"
    }

    It "leaves out values that could not be measured" {
        $report = Format-WinUtilTweakReport -Before ([pscustomobject]@{ Services = 10; Startup = $null }) -After ([pscustomobject]@{ Services = 9; Startup = 4 }) -Applied 1
        $report | Should -Not -BeLike "*برامج بدء التشغيل:*"
    }

    It "always tells the user to restart" {
        Format-WinUtilTweakReport -Before $null -After $null -Applied 3 | Should -BeLike "*أعد تشغيل الجهاز*"
    }
}
