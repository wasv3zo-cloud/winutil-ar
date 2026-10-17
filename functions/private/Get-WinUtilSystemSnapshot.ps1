function Get-WinUtilSystemSnapshot {
    <#
        .SYNOPSIS
            Measures what the tweaks report compares: running services, startup programs, memory

        .DESCRIPTION
            Taken once before the selected tweaks run and once after, so the summary shown at
            the end can say what changed in numbers. A value that cannot be read is $null and
            is left out of the report rather than shown as zero.
    #>

    $snapshot = [ordered]@{ Services = $null; Startup = $null; MemoryMB = $null }

    try {
        $snapshot.Services = @(Get-Service -ErrorAction Stop | Where-Object { $_.Status -eq "Running" }).Count
    } catch {
        Write-WinUtilLog -Level "WARN" -Component "Tweaks" -Message "Report: could not count running services: $($_.Exception.Message)"
    }

    try {
        $snapshot.Startup = @(Get-CimInstance -ClassName Win32_StartupCommand -ErrorAction Stop).Count
    } catch {
        Write-WinUtilLog -Level "WARN" -Component "Tweaks" -Message "Report: could not count startup programs: $($_.Exception.Message)"
    }

    try {
        $os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop
        $snapshot.MemoryMB = [int](($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1KB)
    } catch {
        Write-WinUtilLog -Level "WARN" -Component "Tweaks" -Message "Report: could not read memory use: $($_.Exception.Message)"
    }

    [pscustomobject]$snapshot
}
