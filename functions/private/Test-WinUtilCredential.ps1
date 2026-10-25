function Test-WinUtilCredential {
    <#
        .SYNOPSIS
            Checks a username and password against the login stored in config/auth.json

        .DESCRIPTION
            The password is never stored. config/auth.json holds a random salt and a
            PBKDF2-SHA256 hash of the password, and this function derives the hash from the
            entered password and compares the two in constant time.

        .PARAMETER Username
            The username the user typed. Compared without regard to case.

        .PARAMETER Password
            The password the user typed, as a SecureString from the login dialog.

        .PARAMETER Login
            The login object: username, salt (base64), hash (base64) and iterations.

        .OUTPUTS
            $true when both match, otherwise $false.
    #>
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Username,

        [Parameter(Mandatory)]
        [securestring]$Password,

        [Parameter(Mandatory)]
        $Login
    )

    if ([string]::IsNullOrWhiteSpace([string]$Login.hash) -or [string]::IsNullOrWhiteSpace([string]$Login.salt)) {
        return $false
    }

    $userMatches = [string]::Equals($Username.Trim(), ([string]$Login.username).Trim(), [StringComparison]::OrdinalIgnoreCase)

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }

    $iterations = [int]$Login.iterations
    if ($iterations -lt 1) {
        $iterations = 200000
    }

    try {
        $salt = [Convert]::FromBase64String([string]$Login.salt)
        $expected = [Convert]::FromBase64String([string]$Login.hash)
    } catch {
        return $false
    }

    $kdf = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
        [Text.Encoding]::UTF8.GetBytes($plain), $salt, $iterations,
        [System.Security.Cryptography.HashAlgorithmName]::SHA256)
    try {
        $actual = $kdf.GetBytes($expected.Length)
    } finally {
        $kdf.Dispose()
    }

    # Constant-time comparison: every byte is compared whatever the earlier ones were
    $difference = 0
    for ($i = 0; $i -lt $expected.Length; $i++) {
        $difference = $difference -bor ($actual[$i] -bxor $expected[$i])
    }

    return ($userMatches -and $difference -eq 0 -and $expected.Length -gt 0)
}
