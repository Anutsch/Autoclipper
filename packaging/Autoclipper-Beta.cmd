@echo off
if exist "%~dp0python\python.exe" (
  "%~dp0python\python.exe" "%~dp0templates\src\beta_windows.py"
) else (
  "%~dp0python\install\python.exe" "%~dp0templates\src\beta_windows.py"
)
if errorlevel 1 pause
