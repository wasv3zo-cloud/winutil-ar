function Invoke-WPFFeatureInstall {
    <#

    .SYNOPSIS
        Installs selected Windows Features

    #>

    if ($null -eq $sync.selectedFeatures -or $sync.selectedFeatures.Count -eq 0) {
        Show-WinUtilMessage -Message "لم تحدد أي ميزة من ميزات ويندوز" -Title "WinUtil" -Button "OK" -Icon "Warning"
        return
    }

    Start-WinUtilJob -Name "Features" -Description "تثبيت ميزات ويندوز" -Parameters @{
        Features = @($sync.selectedFeatures)
    } -ScriptBlock {
        param($Features)

        $total = @($Features).Count
        $completed = 0

        foreach ($feature in $Features) {
            $completed++
            Step-WinUtilJob -Status "جارٍ تثبيت $feature ($completed/$total)" -Percent ([int]((($completed - 1) / $total) * 100))
            Measure-WinUtilStep -Scope "Features" -Name $feature -ScriptBlock {
                Invoke-WinUtilFeatureInstall $feature
            }
            Step-WinUtilJob -Status "تم تثبيت $feature ($completed/$total)" -Percent ([int](($completed / $total) * 100))
        }

        Write-Host "A reboot may be required."
    }
}
