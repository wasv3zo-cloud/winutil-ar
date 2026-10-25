BeforeAll {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    . (Join-Path $repoRoot "functions\private\Test-WinUtilCredential.ps1")
    . (Join-Path $repoRoot "functions\private\Invoke-WinUtilLogin.ps1")

    function script:New-TestLogin {
        param([string]$Username, [string]$Password)
        $salt = New-Object byte[] 16
        [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
        $kdf = [Security.Cryptography.Rfc2898DeriveBytes]::new(
            [Text.Encoding]::UTF8.GetBytes($Password), $salt, 1000,
            [Security.Cryptography.HashAlgorithmName]::SHA256)
        [pscustomobject]@{
            username   = $Username
            salt       = [Convert]::ToBase64String($salt)
            hash       = [Convert]::ToBase64String($kdf.GetBytes(32))
            iterations = 1000
        }
    }

    function script:ConvertTo-TestSecure {
        param([string]$Text)
        $secure = New-Object Security.SecureString
        foreach ($char in $Text.ToCharArray()) { $secure.AppendChar($char) }
        $secure
    }

    $script:login = New-TestLogin -Username "turki" -Password "Correct-Horse-9"
}

Describe "Test-WinUtilCredential" {
    It "accepts the right username and password" {
        Test-WinUtilCredential -Username "turki" -Password (ConvertTo-TestSecure "Correct-Horse-9") -Login $script:login | Should -BeTrue
    }

    It "ignores the case of the username" {
        Test-WinUtilCredential -Username "TURKI" -Password (ConvertTo-TestSecure "Correct-Horse-9") -Login $script:login | Should -BeTrue
    }

    It "rejects a wrong password" {
        Test-WinUtilCredential -Username "turki" -Password (ConvertTo-TestSecure "wrong") -Login $script:login | Should -BeFalse
    }

    It "rejects a wrong username" {
        Test-WinUtilCredential -Username "someone" -Password (ConvertTo-TestSecure "Correct-Horse-9") -Login $script:login | Should -BeFalse
    }

    It "rejects everything when no hash is configured" {
        $empty = [pscustomobject]@{ username = ""; salt = ""; hash = ""; iterations = 200000 }
        Test-WinUtilCredential -Username "" -Password (ConvertTo-TestSecure "x") -Login $empty | Should -BeFalse
    }
}

Describe "Invoke-WinUtilLogin" {
    BeforeAll {
        function script:Write-WinUtilLog { param($Level, $Component, $Message) }
        function script:Show-WinUtilLoginDialog { param($Message) }
    }

    It "lets WinUtil start when no login is configured" {
        $empty = [pscustomobject]@{ username = ""; salt = ""; hash = ""; iterations = 200000 }
        Invoke-WinUtilLogin -Login $empty | Should -BeTrue
    }

    It "stops WinUtil when the user cancels" {
        Mock Show-WinUtilLoginDialog { $null }
        Invoke-WinUtilLogin -Login $script:login | Should -BeFalse
    }

    It "lets WinUtil start after the right entry" {
        Mock Show-WinUtilLoginDialog { [pscustomobject]@{ Username = "turki"; Password = (ConvertTo-TestSecure "Correct-Horse-9") } }
        Invoke-WinUtilLogin -Login $script:login | Should -BeTrue
    }

    It "stops WinUtil after three wrong entries" {
        Mock Show-WinUtilLoginDialog { [pscustomobject]@{ Username = "turki"; Password = (ConvertTo-TestSecure "wrong") } }
        Invoke-WinUtilLogin -Login $script:login | Should -BeFalse
        Should -Invoke Show-WinUtilLoginDialog -Times 3 -Exactly
    }
}
