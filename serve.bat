@echo off
rem Open JIZURA locally (double-click). Stop: close this window or press Ctrl+C.
rem Builds into _site\, serves http://localhost:8765/ and rebuilds + reloads the browser when src\ app\ vendor\ change.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed: https://nodejs.org/ & pause & exit /b 1)
node tools\serve.js %*
if errorlevel 1 pause
