function Invoke-WPFExportEnvironmentReport {
    <#
    .SYNOPSIS
        Exports an allowlisted, read-only environment report as JSON, with an optional bundle of
        recent WinUtil logs.
    #>

    try {
        $includeLogs = (Show-WinUtilMessage `
            -Message "هل تريد تضمين سجلات WinUtil لآخر 7 أيام؟ الملف المرافق يحتوي على سجلات خام قد تتضمن مسارات محلية وأوامر وتفاصيل أخطاء. راجعه قبل مشاركته." `
            -Title "تقرير بيئة النظام" -Button "YesNo" -Icon "Question") -eq "Yes"

        Add-Type -AssemblyName System.Windows.Forms
        $dialog = [System.Windows.Forms.SaveFileDialog]::new()
        $dialog.Title = "تصدير تقرير بيئة النظام"
        $dialog.Filter = "JSON files (*.json)|*.json"
        $dialog.FileName = "WinUtilEnvironmentReport_$(Get-Date -Format 'yyyyMMdd').json"
        $dialog.InitialDirectory = [Environment]::GetFolderPath("Desktop")

        if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
            return
        }

        $jsonPath = $dialog.FileName
        $logsPath = Get-WinUtilEnvironmentReportLogsPath -JsonPath $jsonPath

        # SaveFileDialog's own overwrite prompt only covers $jsonPath. A derived companion from a
        # previous export must neither be silently replaced nor left looking like it belongs to new JSON.
        if (Test-Path -LiteralPath $logsPath) {
            if (-not $includeLogs) {
                Show-WinUtilMessage `
                    -Message "يوجد ملف سجلات مسبقًا في:`n$logsPath`n`nاختر اسمًا آخر للتقرير أو اختر تضمين السجلات واستبدال الملف الموجود." `
                    -Title "تقرير بيئة النظام" -Button "OK" -Icon "Warning" | Out-Null
                return
            }

            $replaceLogs = (Show-WinUtilMessage `
                -Message "يوجد ملف سجلات مسبقًا في:`n$logsPath`n`nهل تريد استبداله؟" `
                -Title "تقرير بيئة النظام" -Button "YesNo" -Icon "Warning") -eq "Yes"
            if (-not $replaceLogs) {
                return
            }
        }

        # Registry reads across every tweak/toggle and the log bundle's file read add up to a
        # couple of seconds, so the job layer keeps the Settings handler responsive and owns the
        # progress, taskbar state, logging, and error reporting.
        Start-WinUtilJob -Name "EnvironmentReport" -Description "تصدير تقرير بيئة النظام" -Parameters @{
            JsonPath = $jsonPath
            LogsPath = $logsPath
            IncludeLogs = $includeLogs
        } -ScriptBlock {
            param($JsonPath, $LogsPath, $IncludeLogs)

            Step-WinUtilJob -Status "جارٍ جمع تقرير بيئة النظام" -Percent 10
            $report = Get-WinUtilEnvironmentReport
            $json = $report | ConvertTo-Json -Depth 6

            if ($IncludeLogs) {
                Step-WinUtilJob -Status "جارٍ جمع سجلات WinUtil الأخيرة" -Percent 60
                $logs = Get-WinUtilRecentLogs
            }

            Step-WinUtilJob -Status "جارٍ كتابة تقرير بيئة النظام" -Percent 80
            Write-WinUtilEnvironmentReportExport -JsonPath $JsonPath -Json $json `
                -LogsPath $LogsPath -Logs $logs -IncludeLogs:$IncludeLogs

            Write-WinUtilLog -Component "EnvironmentReport" -Message "Environment report exported to $JsonPath."
            Step-WinUtilJob -Status "اكتمل تصدير تقرير بيئة النظام" -Percent 100
        }
    } catch {
        Write-WinUtilLog -Component "EnvironmentReport" -Level "ERROR" -Message "Environment report export failed: $($_.Exception.Message)"
        Show-WinUtilMessage -Message "تعذّر تصدير تقرير بيئة النظام. $($_.Exception.Message)" `
            -Title "تقرير بيئة النظام" -Button "OK" -Icon "None" | Out-Null
    }
}
