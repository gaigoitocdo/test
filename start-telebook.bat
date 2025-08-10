@echo off
REM start-telebook.bat - Start development with telebook integration

echo 🚀 Starting TWeb with Telebook Integration...

REM Check if pnpm is available
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ pnpm not found. Installing...
    npm install -g pnpm
)

REM Clear Vite cache to avoid issues
echo 🧹 Cleaning cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"

REM Set Node options to handle large headers
echo 🔧 Setting Node.js options...
set NODE_OPTIONS=--max-http-header-size=32768 --max-old-space-size=4096

REM Set environment for development
set NODE_ENV=development
set VITE_TELEBOOK_INTEGRATION=true

REM Start development server
echo 🌐 Starting development server on http://localhost:3000
echo 📱 Telebook admin will be available at http://localhost:3000/telebook
echo.

pnpm run start

pause