function Invoke-WPFtweaksbutton {
  <#

    .SYNOPSIS
        Invokes the functions associated with each group of checkboxes

  #>

  $Tweaks = $sync.selectedTweaks
  $dnsProvider = $sync["WPFchangedns"].text
  if (-not ($dnsProvider)) {
    $dnsProvider = "Default"
  }

  if ($Tweaks.count -eq 0 -and $dnsProvider -eq "Default") {
    Show-WinUtilMessage -Message "يرجى تحديد التحسينات التي تريد تطبيقها." -Title "WinUtil" -Button "OK" -Icon "Warning"
    return
  }

  # A restore point is always taken before tweaks run, even when the user did not tick it,
  # so every change WinUtil makes can be rolled back from Windows System Restore
  $Tweaks = @($Tweaks)
  if ($Tweaks.Count -gt 0 -and $Tweaks -notcontains "WPFTweaksRestorePoint") {
    $Tweaks = @("WPFTweaksRestorePoint") + $Tweaks
    Write-WinUtilLog -Component "Tweaks" -Message "Restore point added automatically before the selected tweaks."
  }

  Write-WinUtilLog -Component "Tweaks" -Message "Tweaks requested: $(@($Tweaks).Count) selected tweak(s), DNS provider: $dnsProvider"

  Start-WinUtilJob -Name "Tweaks" -Description "تطبيق التحسينات" -Parameters @{
    Tweaks = @($Tweaks)
    DnsProvider = $dnsProvider
  } -ScriptBlock {
    param($Tweaks, $DnsProvider)

    # The restore point has to be taken before anything else changes
    $restorePointTweak = "WPFTweaksRestorePoint"
    $tweaksToRun = @($Tweaks | Where-Object { $_ -ne $restorePointTweak })
    $totalSteps = [Math]::Max(@($Tweaks).Count, 1)
    $completedSteps = 0

    # Measured before anything changes, for the before/after summary at the end
    $snapshotBefore = Get-WinUtilSystemSnapshot

    if ($Tweaks -contains $restorePointTweak) {
      Step-WinUtilJob -Status "جارٍ إنشاء نقطة استعادة" -Percent 0
      Write-WinUtilLog -Component "Tweaks" -Message "Creating restore point before applying selected tweaks."
      Measure-WinUtilStep -Scope "Tweaks" -Name $restorePointTweak -ScriptBlock {
        Invoke-WinUtilTweaks $restorePointTweak
      }
      $completedSteps = 1
    }

    if ($DnsProvider -ne "Default") {
      $dnsResult = Measure-WinUtilStep -Scope "Tweaks" -Name "Set DNS to $DnsProvider" -ScriptBlock {
        @(Set-WinUtilDNS -DNSProvider $DnsProvider)
      }

      # Carrying on after the DNS change failed leaves the machine half configured, so the run
      # ends here and the job layer reports it
      if (@($dnsResult)[-1] -ne $true) {
        throw "The DNS change to $DnsProvider failed, so the remaining tweaks were not applied."
      }
    }

    foreach ($tweak in $tweaksToRun) {
      Step-WinUtilJob -Status "جارٍ تطبيق $tweak ($($completedSteps + 1)/$totalSteps)" -Percent ([int](($completedSteps / $totalSteps) * 100))
      Measure-WinUtilStep -Scope "Tweaks" -Name $tweak -ScriptBlock {
        Invoke-WinUtilTweaks $tweak
      }
      $completedSteps++
      Step-WinUtilJob -Percent ([int](($completedSteps / $totalSteps) * 100))
    }

    if (@($Tweaks).Count -gt 0) {
      $report = Format-WinUtilTweakReport -Before $snapshotBefore -After (Get-WinUtilSystemSnapshot) -Applied @($Tweaks).Count
      Show-WinUtilMessage -Message $report -Title "نتيجة التحسينات" -Button "OK" -Icon "Information" | Out-Null
    }
  }
}
