# Official Gradle distribution; not a generated Gradle wrapper.
$ErrorActionPreference = 'Stop'
$version = '8.13'
$cache = Join-Path $env:LOCALAPPDATA 'Nyrathen\Gradle'
$gradle = Join-Path $cache "gradle-$version\bin\gradle.bat"
if (-not (Test-Path $gradle)) {
  New-Item -ItemType Directory -Force $cache | Out-Null
  $zip = Join-Path $cache "gradle-$version-bin.zip"
  $base = "https://services.gradle.org/distributions/gradle-$version-bin.zip"
  Invoke-WebRequest -Uri $base -OutFile $zip
  $expected = (Invoke-RestMethod -Uri "$base.sha256").ToString().Trim().ToLowerInvariant()
  $actual = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw 'Gradle checksum mismatch. Build stopped.' }
  Expand-Archive -Force $zip $cache
}
Set-Location $PSScriptRoot
& $gradle @args
exit $LASTEXITCODE
