@echo off
rem Huddle: build and run planning poker on this machine, reachable by everyone on the LAN.
rem
rem   run.bat              build (if needed) and start on port 8080
rem   run.bat --rebuild    force a fresh frontend + backend build
rem
rem Database settings (override with environment variables):
rem   DB_HOST=localhost DB_PORT=5432 DB_NAME=planning_poker DB_USERNAME=postgres DB_PASSWORD=...

setlocal
cd /d "%~dp0"

if not defined DB_HOST set "DB_HOST=localhost"
if not defined DB_PORT set "DB_PORT=5432"
if not defined DB_NAME set "DB_NAME=planning_poker"
if not defined DB_USERNAME set "DB_USERNAME=postgres"
if not defined PORT set "PORT=8080"

rem ---------------------------------------------------------------- database password (typed, not shown)
if not defined DB_PASSWORD (
  for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$s = Read-Host 'Postgres password for ''%DB_USERNAME%''' -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))"`) do set "DB_PASSWORD=%%P"
)
set "PGPASSWORD=%DB_PASSWORD%"

rem ---------------------------------------------------------------- create the database if it's missing
set "PG_BIN="
for %%V in (17 16 15) do (
  if not defined PG_BIN if exist "C:\Program Files\PostgreSQL\%%V\bin\psql.exe" set "PG_BIN=C:\Program Files\PostgreSQL\%%V\bin"
)
if not defined PG_BIN (
  for /f "delims=" %%I in ('where psql.exe 2^>nul') do if not defined PG_BIN set "PG_BIN=%%~dpI"
)

if defined PG_BIN (
  "%PG_BIN%\psql.exe" -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d postgres -tAc "select 1 from pg_database where datname = '%DB_NAME%'" > "%TEMP%\huddle-dbcheck.txt" 2>&1
  if errorlevel 1 (
    type "%TEMP%\huddle-dbcheck.txt"
    echo Could not connect to Postgres at %DB_HOST%:%DB_PORT% as '%DB_USERNAME%'. Check the password and that the server is running.
    del "%TEMP%\huddle-dbcheck.txt" >nul 2>&1
    exit /b 1
  )
  findstr /x "1" "%TEMP%\huddle-dbcheck.txt" >nul || (
    echo -^> Creating database %DB_NAME%
    "%PG_BIN%\createdb.exe" -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% %DB_NAME% || (echo Could not create database '%DB_NAME%'. & exit /b 1)
  )
  del "%TEMP%\huddle-dbcheck.txt" >nul 2>&1
) else (
  echo ! psql not found; make sure the database '%DB_NAME%' exists.
)

rem ---------------------------------------------------------------- build if needed
set "JAR=backend\target\huddle.jar"
set "REBUILD="
if /i "%~1"=="--rebuild" set "REBUILD=1"
if not exist "%JAR%" set "REBUILD=1"

if defined REBUILD (
  echo -^> Building the React frontend
  pushd frontend
  if not exist node_modules (
    call npm ci --no-audit --no-fund || (popd & echo npm ci failed & exit /b 1)
  )
  call npm run build || (popd & echo Frontend build failed & exit /b 1)
  popd

  echo -^> Building the Spring Boot backend ^(runs the DDD architecture tests too^)
  pushd backend
  call mvn -q -B package || (popd & echo Backend build failed & exit /b 1)
  popd
)

rem ---------------------------------------------------------------- share links
echo.
echo   Huddle is starting. Share one of these links with your team:
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%B in ("%%A") do echo       http://%%B:%PORT%
)
echo.
echo   (If colleagues can't connect, allow Java through Windows Defender Firewall on port %PORT%.)
echo.

rem ---------------------------------------------------------------- run
set "DB_URL=jdbc:postgresql://%DB_HOST%:%DB_PORT%/%DB_NAME%"
java -jar "%JAR%"
exit /b %errorlevel%
