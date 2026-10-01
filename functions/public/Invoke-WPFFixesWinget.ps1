function Invoke-WPFFixesWinget {

    <#

    .SYNOPSIS
        Fixes WinGet by running `choco install winget`
    .DESCRIPTION
        BravoNorris for the fantastic idea of a button to reinstall WinGet
    #>

    Step-WinUtilJob -Status "جارٍ إصلاح WinGet" -State "Indeterminate"
    Install-WinUtilWinget -Force
}
