param(
    [string]$Address = "127.0.0.1:8001",
    [switch]$SkipSync
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$pythonCandidates = @(
    (Join-Path $repoRoot ".venv\Scripts\python.exe"),
    (Join-Path $repoRoot ".venv-docs\Scripts\python.exe")
)
$python = $null
foreach ($candidate in $pythonCandidates) {
    if (-not (Test-Path -LiteralPath $candidate)) {
        continue
    }
    $candidateWorks = $false
    try {
        & $candidate -c "import mkdocs" *> $null
        $candidateWorks = $LASTEXITCODE -eq 0
    }
    catch {
        $candidateWorks = $false
    }
    if ($candidateWorks) {
        $python = $candidate
        break
    }
}

if (-not $python) {
    throw @"
No working project Python environment with MkDocs was found.
Run these commands once from the repository root:
  py -m venv .venv
  .\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
"@
}

Push-Location $repoRoot
try {
    if (-not $SkipSync) {
        & npm.cmd run data:sync
        if ($LASTEXITCODE -ne 0) {
            throw "data:sync failed"
        }
    }

    Write-Host "Documentation site: http://$Address/"
    Write-Host "Press Ctrl+C to stop."
    & $python -m mkdocs serve --strict -a $Address
    if ($LASTEXITCODE -ne 0) {
        throw "mkdocs serve failed"
    }
}
finally {
    Pop-Location
}
