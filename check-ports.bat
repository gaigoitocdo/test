@echo off
:: Port Checker for Telebook Setup
:: File: D:\tools\tweb-master\tweb-master\check-ports.bat

echo ====================================
echo 🔍 Checking Port Usage for Telebook
echo ====================================
echo.

echo 📊 Current port usage:
echo.

echo 🌐 Port 8080 (Telegram Web):
netstat -an | findstr ":8080" 
if %errorlevel% equ 0 (
    echo    ✅ Port 8080 is in use by Telegram Web
) else (
    echo    ❌ Port 8080 is free
)
echo.

echo 🐘 Port 8090 (PHP Server):
netstat -an | findstr ":8090"
if %errorlevel% equ 0 (
    echo    ⚠️  Port 8090 is in use
) else (
    echo    ✅ Port 8090 is free (good for PHP)
)
echo.

echo 🔗 Port 8091 (CORS Proxy):
netstat -an | findstr ":8091"
if %errorlevel% equ 0 (
    echo    ⚠️  Port 8091 is in use
) else (
    echo    ✅ Port 8091 is free (good for proxy)
)
echo.

echo ====================================
echo 💡 Recommended setup:
echo    • Telegram Web: http://localhost:8080
echo    • PHP Server:   http://localhost:8090
echo    • CORS Proxy:   http://localhost:8091
echo ====================================
echo.

echo 🚀 Quick test links:
echo.
echo Telegram Web:
echo    http://localhost:8080
echo.
echo PHP Server (direct):
echo    http://localhost:8090/home
echo.
echo CORS Proxy:
echo    http://localhost:8091/home
echo.

pause