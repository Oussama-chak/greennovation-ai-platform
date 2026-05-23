# Run FastAPI from repo root. Usage: .\scripts\run-backend.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
Write-Host "Repo root: $Root"
pip install -e ".[api]" --upgrade
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
