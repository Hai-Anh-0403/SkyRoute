<#
.SYNOPSIS
    Khoi chay toan bo stack SkyRoute (PostGIS + Redis + Migrations + Seed + Backend + Frontend) bang 1 lenh.
.EXAMPLE
    .\dev.ps1
    .\dev.ps1 -Reseed
#>
param(
    [switch]$Reseed
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RootDir = $PSScriptRoot
Push-Location $RootDir

function Get-NonSecretEnvValue {
    param(
        [string]$EnvPath,
        [string]$Key,
        [string]$DefaultValue
    )
    if (-not (Test-Path $EnvPath)) {
        return $DefaultValue
    }
    foreach ($line in Get-Content -Path $EnvPath -Encoding UTF8) {
        if ($line -match "^\s*$Key\s*=\s*(.+?)\s*$") {
            return $Matches[1].Trim('"', "'")
        }
    }
    return $DefaultValue
}

function Invoke-NativeQuiet {
    param([string]$Command)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        cmd /c "$Command >nul 2>nul"
        return ($LASTEXITCODE -eq 0)
    } finally {
        $ErrorActionPreference = $prev
    }
}

$backendProc = $null

try {
    $envPath = Join-Path $RootDir '.env'
    $dbUser = Get-NonSecretEnvValue -EnvPath $envPath -Key 'DB_USERNAME' -DefaultValue 'skyroute'
    $dbName = Get-NonSecretEnvValue -EnvPath $envPath -Key 'DB_NAME' -DefaultValue 'skyroute_db'

    Write-Host '[1/5] Kiem tra Docker Desktop...' -ForegroundColor Cyan
    if (-not (Invoke-NativeQuiet 'docker info')) {
        Write-Host 'LOI: Docker Desktop chua chay. Vui long mo Docker Desktop truoc roi chay lai .\dev.ps1' -ForegroundColor Red
        exit 1
    }

    Write-Host '[2/5] Khoi dong PostgreSQL/PostGIS & Redis...' -ForegroundColor Cyan
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        throw 'Khong the khoi dong containers bang docker compose up -d.'
    }

    $maxWaitSec = 60
    $ready = $false
    for ($i = 0; $i -lt $maxWaitSec; $i++) {
        $pgOk = Invoke-NativeQuiet "docker exec skyroute-postgres pg_isready -U `"$dbUser`" -d `"$dbName`""
        $redisOk = Invoke-NativeQuiet 'docker exec skyroute-redis redis-cli ping'
        if ($pgOk -and $redisOk) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }

    if (-not $ready) {
        throw "PostgreSQL hoac Redis chua san sang sau $maxWaitSec giay."
    }

    Write-Host '[3/5] Chay TypeORM migrations...' -ForegroundColor Cyan
    npm --prefix backend run migration:run
    if ($LASTEXITCODE -ne 0) {
        throw 'Migration that bai.'
    }

    Write-Host '[4/5] Kiem tra du lieu mau Da Lat...' -ForegroundColor Cyan
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $placeCountRaw = docker exec skyroute-postgres psql -U $dbUser -d $dbName -tAc 'SELECT COUNT(*) FROM places;' 2>$null
    $psqlExit = $LASTEXITCODE
    $ErrorActionPreference = $prevPref

    $placeCount = 0
    if ($psqlExit -eq 0 -and ($placeCountRaw -as [string]) -match '^\s*(\d+)\s*$') {
        $placeCount = [int]$Matches[1]
    }

    if ($Reseed -or $placeCount -eq 0) {
        Write-Host "Dang nap du lieu mau Da Lat (places hien tai: $placeCount)..." -ForegroundColor Yellow
        npm --prefix backend run seed
        if ($LASTEXITCODE -ne 0) {
            throw 'Seed du lieu that bai.'
        }
    } else {
        Write-Host "Da co $placeCount dia diem trong DB — bo qua seed de giu nguyen lich trinh (dung -Reseed de nap lai)." -ForegroundColor DarkGray
    }

    Write-Host '[5/5] Khoi chay Backend API & Frontend Next.js...' -ForegroundColor Cyan
    Write-Host '  -> Frontend : http://localhost:3000' -ForegroundColor Green
    Write-Host '  -> API Docs : http://localhost:3001/api/docs' -ForegroundColor Green
    Write-Host '  (Nhan Ctrl+C tai cua so nay de dung ca Frontend va Backend)' -ForegroundColor DarkGray

    $backendCmd = "Set-Location '$RootDir'; npm --prefix backend run start:dev"
    $backendProc = Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $backendCmd -WorkingDirectory $RootDir -PassThru

    npm --prefix frontend run dev
} finally {
    if ($null -ne $backendProc -and -not $backendProc.HasExited) {
        Write-Host 'Dang tat Backend...' -ForegroundColor Yellow
        cmd /c "taskkill /PID $($backendProc.Id) /T /F >nul 2>nul"
    }
    Pop-Location
}
