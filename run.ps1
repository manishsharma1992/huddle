<#
  Huddle: build and run planning poker on this machine, reachable by everyone on the LAN.

    .\run.ps1              build (if needed) and start on port 8080
    .\run.ps1 --rebuild    force a fresh frontend + backend build

  Database settings (override with environment variables):
    DB_HOST=localhost DB_PORT=5432 DB_NAME=planning_poker DB_USERNAME=postgres DB_PASSWORD=...

  If scripts are blocked, run once:  powershell -ExecutionPolicy Bypass -File .\run.ps1
#>
param([string]$Mode = '')

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Get-Setting([string]$Name, [string]$Default) {
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrEmpty($value)) { return $Default } else { return $value }
}

$DbHost = Get-Setting 'DB_HOST' 'localhost'
$DbPort = Get-Setting 'DB_PORT' '5432'
$DbName = Get-Setting 'DB_NAME' 'planning_poker'
$DbUser = Get-Setting 'DB_USERNAME' 'postgres'
$Port   = Get-Setting 'PORT' '8080'

# ---------------------------------------------------------------- database password
$DbPassword = [Environment]::GetEnvironmentVariable('DB_PASSWORD')
if ([string]::IsNullOrEmpty($DbPassword)) {
    $secure = Read-Host "Postgres password for '$DbUser'" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
$env:PGPASSWORD = $DbPassword

# ---------------------------------------------------------------- create the database if it's missing
$psql = $null
$candidates = @(
    'C:\Program Files\PostgreSQL\17\bin',
    'C:\Program Files\PostgreSQL\16\bin',
    'C:\Program Files\PostgreSQL\15\bin'
)
foreach ($dir in $candidates) {
    if (Test-Path (Join-Path $dir 'psql.exe')) { $psql = $dir; break }
}
if (-not $psql) {
    $found = Get-Command psql.exe -ErrorAction SilentlyContinue
    if ($found) { $psql = Split-Path $found.Source }
}

if ($psql) {
    $exists = & (Join-Path $psql 'psql.exe') -h $DbHost -p $DbPort -U $DbUser -d postgres -tAc "select 1 from pg_database where datname = '$DbName'"
    if ($LASTEXITCODE -ne 0) { throw "Could not connect to Postgres at ${DbHost}:${DbPort} as '$DbUser'. Check the password and that the server is running." }
    if (-not ("$exists".Trim() -eq '1')) {
        Write-Host "-> Creating database $DbName"
        & (Join-Path $psql 'createdb.exe') -h $DbHost -p $DbPort -U $DbUser $DbName
        if ($LASTEXITCODE -ne 0) { throw "Could not create database '$DbName'." }
    }
} else {
    Write-Host "! psql not found; make sure the database '$DbName' exists."
}

# ---------------------------------------------------------------- build if needed
$Jar = 'backend\target\huddle.jar'
if ($Mode -eq '--rebuild' -or -not (Test-Path $Jar)) {
    Write-Host '-> Building the React frontend'
    Push-Location frontend
    try {
        if (-not (Test-Path 'node_modules')) { npm ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' } }
        npm run build; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
    } finally { Pop-Location }

    Write-Host '-> Building the Spring Boot backend (runs the DDD architecture tests too)'
    Push-Location backend
    try {
        mvn -q -B package; if ($LASTEXITCODE -ne 0) { throw 'Backend build failed' }
    } finally { Pop-Location }
}

# ---------------------------------------------------------------- share links
Write-Host ''
Write-Host '  Huddle is starting. Share one of these links with your team:'
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    ForEach-Object { Write-Host "      http://$($_.IPAddress):$Port" }
Write-Host ''
Write-Host "  (If colleagues can't connect, allow Java through Windows Defender Firewall on port $Port.)"
Write-Host ''

# ---------------------------------------------------------------- run
$env:DB_URL = "jdbc:postgresql://${DbHost}:${DbPort}/${DbName}"
$env:DB_USERNAME = $DbUser
$env:DB_PASSWORD = $DbPassword
$env:PORT = $Port
& java -jar $Jar
exit $LASTEXITCODE
