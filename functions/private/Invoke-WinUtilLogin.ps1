function Invoke-WinUtilLogin {
    <#
        .SYNOPSIS
            Asks for the owner's username and password before WinUtil does anything

        .DESCRIPTION
            Runs before both the interface and the -Config/-Preset runs. When config/auth.json
            has no hash yet, no login is configured and WinUtil starts as before.

            The user gets $MaxAttempts tries. Cancelling or running out of tries returns $false
            and the caller stops.

        .PARAMETER Login
            The login object from config/auth.json.

        .PARAMETER MaxAttempts
            How many wrong entries are allowed before WinUtil stops.

        .OUTPUTS
            $true when WinUtil may continue, otherwise $false.
    #>
    param(
        $Login = $sync.configs.auth.login,
        [int]$MaxAttempts = 3
    )

    if ($null -eq $Login -or [string]::IsNullOrWhiteSpace([string]$Login.hash)) {
        Write-WinUtilLog -Level "WARN" -Component "Login" -Message "No login is configured in config/auth.json; starting without one."
        return $true
    }

    $message = ""
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        $entry = Show-WinUtilLoginDialog -Message $message
        if ($null -eq $entry) {
            Write-WinUtilLog -Component "Login" -Message "Login cancelled."
            return $false
        }

        if (Test-WinUtilCredential -Username $entry.Username -Password $entry.Password -Login $Login) {
            Write-WinUtilLog -Component "Login" -Message "Login succeeded."
            return $true
        }

        Write-WinUtilLog -Level "WARN" -Component "Login" -Message "Login failed ($attempt/$MaxAttempts)."
        $message = "اسم المستخدم أو كلمة المرور غير صحيحة. المحاولات المتبقية: $($MaxAttempts - $attempt)"
    }

    return $false
}
