@echo off
if exist "%~dp0Portaria Escolar Local-First.exe" (
  start "" "%~dp0Portaria Escolar Local-First.exe"
) else (
  start "" "%~dp0dist_electron\win-unpacked\Portaria Escolar Local-First.exe"
)
