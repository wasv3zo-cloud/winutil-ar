function Format-WinUtilTweakReport {
    <#
        .SYNOPSIS
            Builds the Arabic summary shown when the selected tweaks finish

        .DESCRIPTION
            Compares two Get-WinUtilSystemSnapshot results line by line. Services set to
            manual and startup entries removed mostly take effect after a restart, so the
            text says so instead of promising numbers the machine has not reached yet.

        .PARAMETER Before
            The snapshot taken before the tweaks ran.

        .PARAMETER After
            The snapshot taken after the tweaks ran.

        .PARAMETER Applied
            How many tweaks were applied (the automatic restore point included).
    #>
    param(
        $Before,
        $After,
        [int]$Applied
    )

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("اكتمل تطبيق التحسينات ✓ ($Applied)")
    $lines.Add("")

    $rows = @(
        @{ Name = "الخدمات العاملة"; Key = "Services"; Unit = "" }
        @{ Name = "برامج بدء التشغيل"; Key = "Startup"; Unit = "" }
        @{ Name = "الذاكرة المستخدمة"; Key = "MemoryMB"; Unit = " ميجابايت" }
    )
    foreach ($row in $rows) {
        $old = if ($null -ne $Before) { $Before.($row.Key) } else { $null }
        $new = if ($null -ne $After) { $After.($row.Key) } else { $null }
        if ($null -eq $old -or $null -eq $new) {
            continue
        }
        $delta = $new - $old
        $change = if ($delta -lt 0) { " (أقل بـ $([math]::Abs($delta)))" } elseif ($delta -gt 0) { " (+$delta)" } else { " (بلا تغيير)" }
        $lines.Add("• $($row.Name): $old ← $new$($row.Unit)$change")
    }

    $lines.Add("")
    $lines.Add("أُنشئت نقطة استعادة قبل التطبيق، فتستطيع الرجوع في أي وقت.")
    $lines.Add("أعد تشغيل الجهاز: أغلب الفرق في الخدمات وبرامج بدء التشغيل يظهر بعد إعادة التشغيل.")
    $lines -join "`n"
}
