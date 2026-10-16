<#
    .SYNOPSIS
        Applies branding/brand.json to the WinUtil source files.

    .DESCRIPTION
        brand.json is written by the "صمّم نسختك" studio page on the website (through the GitHub API).
        This script copies its values into the files WinUtil is compiled from:

          - colors       -> config/themes.json (the theme named in "theme", Dark by default)
          - logo.path1-3 -> the three vector logo colors in functions/private/Invoke-WinUtilAssets.ps1
          - logoImage    -> functions/private/Get-WinUtilBrandLogo.ps1 (the PNG as base64);
                            the file is removed when no image is set

        Every value is validated before it is written: colors must be #RRGGBB or #AARRGGBB, keys must
        already exist in the theme, and the image must be a real PNG under the size limit. brand.json
        comes from a web page, so nothing in it is ever written into a .ps1 file unchecked.

        Run by .github/workflows/brand-rebuild.yaml before Compile.ps1. Safe to run locally.

    .PARAMETER BrandFile
        Path to the brand file. Defaults to branding/brand.json.
#>
param (
    [string]$BrandFile = "branding/brand.json"
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$hexColor = '^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$'
$maxLogoBytes = 300KB
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

if (-not (Test-Path -LiteralPath $BrandFile)) {
    throw "Brand file not found: $BrandFile"
}
$brand = Get-Content -LiteralPath $BrandFile -Raw -Encoding UTF8 | ConvertFrom-Json

# ---------- 1. Theme colors -> config/themes.json ----------
$themeName = if ($brand.theme) { [string]$brand.theme } else { 'Dark' }
if ($themeName -notin @('Dark', 'Light')) {
    throw "theme must be Dark or Light, got '$themeName'"
}

$themesPath = 'config/themes.json'
$themesText = Get-Content -LiteralPath $themesPath -Raw -Encoding UTF8
$themes = $themesText | ConvertFrom-Json

# Locate the theme block in the raw text so only its values change and the file keeps its formatting.
$blockStart = $themesText.IndexOf("`"$themeName`": {")
if ($blockStart -lt 0) { throw "Theme '$themeName' not found in $themesPath" }
$blockEnd = $themesText.IndexOf('}', $blockStart)
$block = $themesText.Substring($blockStart, $blockEnd - $blockStart)

$changedColors = 0
foreach ($property in $brand.colors.PSObject.Properties) {
    $key = $property.Name
    $value = [string]$property.Value
    if ($value -notmatch $hexColor) { throw "Color '$key' is not a hex color: '$value'" }
    if ($null -eq $themes.$themeName.PSObject.Properties[$key]) { throw "Unknown theme key '$key'" }

    $pattern = '("' + [regex]::Escape($key) + '":\s*")[^"]*(")'
    $updated = [regex]::Replace($block, $pattern, { param($m) $m.Groups[1].Value + $value + $m.Groups[2].Value })
    if ($updated -ne $block) { $changedColors++ }
    $block = $updated
}
$themesText = $themesText.Substring(0, $blockStart) + $block + $themesText.Substring($blockEnd)
$null = $themesText | ConvertFrom-Json   # still valid JSON
[System.IO.File]::WriteAllText((Join-Path $root $themesPath), $themesText, $utf8NoBom)
Write-Host "themes.json: $changedColors color(s) changed in '$themeName'"

# ---------- 2. Vector logo colors -> Invoke-WinUtilAssets.ps1 ----------
$assetsPath = 'functions/private/Invoke-WinUtilAssets.ps1'
$assetsText = Get-Content -LiteralPath $assetsPath -Raw -Encoding UTF8
foreach ($index in 1..3) {
    $value = [string]$brand.logo."path$index"
    if (-not $value) { continue }
    if ($value -notmatch $hexColor) { throw "logo.path$index is not a hex color: '$value'" }
    $pattern = '(\$LogoPath' + $index + '\.Fill = \[System\.Windows\.Media\.BrushConverter\]::new\(\)\.ConvertFromString\(")#[0-9A-Fa-f]{6,8}("\))'
    if ($assetsText -notmatch $pattern) { throw "Logo color $index not found in $assetsPath" }
    $assetsText = [regex]::Replace($assetsText, $pattern, { param($m) $m.Groups[1].Value + $value + $m.Groups[2].Value })
}
[System.IO.File]::WriteAllText((Join-Path $root $assetsPath), $assetsText, $utf8NoBom)
Write-Host "Invoke-WinUtilAssets.ps1: logo colors applied"

# ---------- 3. Logo image -> Get-WinUtilBrandLogo.ps1 ----------
$logoFunctionPath = 'functions/private/Get-WinUtilBrandLogo.ps1'
$logoImage = [string]$brand.logoImage
if ($logoImage) {
    if ($logoImage -notmatch '^branding/[A-Za-z0-9._-]+\.png$') { throw "logoImage must be a PNG under branding/: '$logoImage'" }
    if (-not (Test-Path -LiteralPath $logoImage)) { throw "Logo image not found: $logoImage" }

    $bytes = [System.IO.File]::ReadAllBytes((Join-Path $root $logoImage))
    if ($bytes.Length -gt $maxLogoBytes) { throw "Logo image is larger than $($maxLogoBytes / 1KB) KB" }
    $pngSignature = [byte[]](0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
    if ($bytes.Length -lt 8 -or (Compare-Object $bytes[0..7] $pngSignature)) { throw "$logoImage is not a PNG file" }

    $base64 = [Convert]::ToBase64String($bytes)   # only A-Z a-z 0-9 + / = : safe inside a quoted string
    $functionText = @"
function Get-WinUtilBrandLogo {
    <#
        .SYNOPSIS
            Returns the custom logo (PNG, base64) used by Invoke-WinUtilAssets.
            Generated by tools/Apply-Brand.ps1 from $logoImage. Do not edit by hand.
    #>
    return '$base64'
}
"@
    [System.IO.File]::WriteAllText((Join-Path $root $logoFunctionPath), $functionText + "`n", $utf8NoBom)
    Write-Host "Get-WinUtilBrandLogo.ps1: logo image embedded ($([math]::Round($bytes.Length / 1KB)) KB)"
} elseif (Test-Path -LiteralPath $logoFunctionPath) {
    Remove-Item -LiteralPath $logoFunctionPath
    Write-Host "Get-WinUtilBrandLogo.ps1: removed (no logo image set)"
}
