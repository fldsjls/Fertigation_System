$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    & npm.cmd run data:check
    if ($LASTEXITCODE -ne 0) { throw "data:check failed" }

    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw "test failed" }

    $pythonCandidates = @(
        (Join-Path $repoRoot ".venv-docs\Scripts\python.exe"),
        (Join-Path $repoRoot ".venv\Scripts\python.exe")
    )
    $python = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $python) {
        throw "No project Python environment found. Create .venv-docs or .venv and install requirements-dev.txt."
    }

    & $python -m mkdocs build --strict
    if ($LASTEXITCODE -ne 0) { throw "mkdocs strict build failed" }
}
finally {
    Pop-Location
}
