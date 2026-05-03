param(
  [string]$SourceDir,

  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..") | Select-Object -First 1).Path
)

$ErrorActionPreference = "Stop"

function Read-Json($path) {
  return Get-Content -Raw -Encoding UTF8 $path | ConvertFrom-Json
}

function Ensure-Dir($path) {
  if (!(Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
}

function Get-ImagesFromRow($row) {
  $imgs = @()
  if ($null -ne $row.images) { $imgs += $row.images }
  if ($null -ne $row.image) {
    if ($row.image -is [System.Array]) { $imgs += $row.image } else { $imgs += @($row.image) }
  }
  return $imgs | Where-Object { $_ -and $_ -is [string] }
}

function Copy-IfFound($srcDir, $destPath) {
  $destDir = Split-Path -Parent $destPath
  Ensure-Dir $destDir

  $destName = Split-Path -Leaf $destPath
  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($destName)
  $ext = [System.IO.Path]::GetExtension($destName)

  # Try exact match first
  $exact = Join-Path $srcDir $destName
  if (Test-Path $exact) {
    Copy-Item -Force -Path $exact -Destination $destPath
    return $true
  }

  # Try case-insensitive match for same filename
  $candidate = Get-ChildItem -File $srcDir -Recurse | Where-Object {
    $_.Name -ieq $destName
  } | Select-Object -First 1
  if ($candidate) {
    Copy-Item -Force -Path $candidate.FullName -Destination $destPath
    return $true
  }

  # Try same baseName with common image extensions
  $exts = @($ext, ".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP") | Select-Object -Unique
  foreach ($e in $exts) {
    $cand2 = Get-ChildItem -File $srcDir -Recurse | Where-Object {
      $_.BaseName -ieq $baseName -and $_.Extension -ieq $e
    } | Select-Object -First 1
    if ($cand2) {
      Copy-Item -Force -Path $cand2.FullName -Destination $destPath
      return $true
    }
  }

  return $false
}

$defaultSource = Join-Path $ProjectRoot "src\\app\\assets\\images\\Images"
$useSource = if ($SourceDir -and $SourceDir.Trim().Length -gt 0) { $SourceDir } else { $defaultSource }

$src = (Resolve-Path $useSource | Select-Object -First 1).Path
if (!(Test-Path $src)) { throw "SourceDir not found: $useSource" }

$jsonDir = Join-Path ([string]$ProjectRoot) "src/app/data/json"
$targets = @(
  (Join-Path $jsonDir "buildings.json" | Select-Object -First 1),
  (Join-Path $jsonDir "rooms.json" | Select-Object -First 1),
  (Join-Path $jsonDir "offices.json" | Select-Object -First 1),
  (Join-Path $jsonDir "facilities.json" | Select-Object -First 1),
  (Join-Path $jsonDir "cr.json" | Select-Object -First 1)
)

$urls = New-Object System.Collections.Generic.HashSet[string]
foreach ($p in $targets) {
  if (!(Test-Path $p)) { continue }
  $rows = Read-Json $p
  foreach ($r in $rows) {
    foreach ($u in (Get-ImagesFromRow $r)) {
      if ($u.StartsWith("/images/")) { $null = $urls.Add($u) }
    }
  }
}

$publicDir = Join-Path $ProjectRoot "public"
$copied = 0
$missing = @()

foreach ($u in ($urls | Sort-Object)) {
  $rel = $u.TrimStart("/").Replace("/", "\")
  $dest = Join-Path $publicDir $rel
  if (Test-Path $dest) { continue }

  if (Copy-IfFound -srcDir $src -destPath $dest) {
    $copied++
  } else {
    $missing += $u
  }
}

Write-Host ""
Write-Host "Copied: $copied"
Write-Host "Missing: $($missing.Count)"
if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "Missing URLs (copy/rename these into your source folder):"
  $missing | ForEach-Object { Write-Host " - $_" }
}

