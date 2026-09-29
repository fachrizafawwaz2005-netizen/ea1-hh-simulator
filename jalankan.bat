@echo off
cd /d "%~dp0"
echo Menjalankan server di http://127.0.0.1:3000 ...
start "" http://127.0.0.1:3000
python server.py
pause
