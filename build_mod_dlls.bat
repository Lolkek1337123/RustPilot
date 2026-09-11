@echo off
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set CSC=C:\Windows\Microsoft.NET\Framework64\v3.5\csc.exe
if not exist "%CSC%" set CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe

set SERVERS_ROOT=%~dp0..\..\servers
if not "%~1"=="" set SERVERS_ROOT=%~1

set CLIENT_MANAGED=%SERVERS_ROOT%\Rust_Devblog_65\client\RustClient_Data\Managed
set PRISTINE_MANAGED=%SERVERS_ROOT%\Rust_Devblog_65\client_pristine

echo [1/3] Compiling RustPilot.Client.dll (.NET 3.5)...
if not exist "%CLIENT_MANAGED%" (
  echo [SKIP] Client Managed folder not found at %CLIENT_MANAGED%
  goto build_oxide
)

set PRISTINE_DLL=%PRISTINE_MANAGED%\Assembly-CSharp.dll
if not exist "%PRISTINE_DLL%" set PRISTINE_DLL=%CLIENT_MANAGED%\Assembly-CSharp.dll

"%CSC%" /target:library /optimize+ /unsafe /nowarn:0169,0414,0649,1701,1702,1703 /nostdlib /noconfig ^
  /r:"%CLIENT_MANAGED%\mscorlib.dll" ^
  /r:"%CLIENT_MANAGED%\System.dll" ^
  /r:"%CLIENT_MANAGED%\System.Core.dll" ^
  /r:"%CLIENT_MANAGED%\UnityEngine.dll" ^
  /r:"%CLIENT_MANAGED%\UnityEngine.UI.dll" ^
  /r:"%PRISTINE_DLL%" ^
  /r:"%CLIENT_MANAGED%\Assembly-CSharp-firstpass.dll" ^
  /r:"%CLIENT_MANAGED%\Facepunch.UnityEngine.dll" ^
  /r:"%CLIENT_MANAGED%\Facepunch.Network.dll" ^
  /r:"%CLIENT_MANAGED%\Facepunch.Console.dll" ^
  /r:"%CLIENT_MANAGED%\Newtonsoft.Json.dll" ^
  /out:"%CLIENT_MANAGED%\RustPilot.Client.dll" ^
  "%SCRIPT_DIR%RustPilot.Client\ClientModMenu.cs" ^
  "%SCRIPT_DIR%RustPilot.Client\RussianLocalization.cs" ^
  "%SCRIPT_DIR%RustPilot.Client\SteamAuthManager.cs"

if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to compile RustPilot.Client.dll
  exit /b %ERRORLEVEL%
)
echo [OK] RustPilot.Client.dll compiled successfully.

echo [2/3] Weaving classes directly into native Assembly-CSharp.dll...
dotnet run --project "%SCRIPT_DIR%RustPilot.Patcher\RustPilot.Patcher.csproj" -- "%CLIENT_MANAGED%" "%CLIENT_MANAGED%\RustPilot.Client.dll"
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to patch native Assembly-CSharp.dll
  exit /b %ERRORLEVEL%
)

:build_oxide
echo [3/3] Compiling RustPilot.Oxide.dll (.NET 3.5)...
set SERVER_MANAGED=%SERVERS_ROOT%\Rust_Devblog_65\server\RustDedicated_Data\Managed
if not exist "%SERVER_MANAGED%" (
  echo [SKIP] Server Managed folder not found at %SERVER_MANAGED%
  goto done
)

"%CSC%" /target:library /optimize+ /unsafe /nowarn:0169,0414,0649,1701,1702,1703 /nostdlib /noconfig ^
  /r:"%SERVER_MANAGED%\mscorlib.dll" ^
  /r:"%SERVER_MANAGED%\System.dll" ^
  /r:"%SERVER_MANAGED%\System.Core.dll" ^
  /r:"%SERVER_MANAGED%\UnityEngine.dll" ^
  /r:"%SERVER_MANAGED%\UnityEngine.UI.dll" ^
  /r:"%SERVER_MANAGED%\Assembly-CSharp.dll" ^
  /r:"%SERVER_MANAGED%\Assembly-CSharp-firstpass.dll" ^
  /r:"%SERVER_MANAGED%\Facepunch.Network.dll" ^
  /r:"%SERVER_MANAGED%\Facepunch.Console.dll" ^
  /r:"%SERVER_MANAGED%\Newtonsoft.Json.dll" ^
  /r:"%SERVER_MANAGED%\protobuf-net.dll" ^
  /out:"%SERVER_MANAGED%\RustPilot.Oxide.dll" ^
  "%SCRIPT_DIR%RustPilot.Oxide\Oxide\Core\Interface.cs" ^
  "%SCRIPT_DIR%RustPilot.Oxide\Oxide\Core\Libraries\Timer.cs" ^
  "%SCRIPT_DIR%RustPilot.Oxide\Oxide\Core\Libraries\Permission.cs" ^
  "%SCRIPT_DIR%RustPilot.Oxide\Oxide\Core\Libraries\Lang.cs" ^
  "%SCRIPT_DIR%RustPilot.Oxide\Oxide\Core\Plugins\Plugin.cs" ^
  "%SCRIPT_DIR%RustPilot.Oxide\Oxide\Core\Plugins\PluginManager.cs" ^
  "%SCRIPT_DIR%RustPilot.Oxide\Oxide\Plugins\RustPlugin.cs" ^
  "%SCRIPT_DIR%RustPilot.Oxide\Oxide\Game\Rust\Cui\CuiHelper.cs"

if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to compile RustPilot.Oxide.dll
  exit /b %ERRORLEVEL%
)
echo [OK] RustPilot.Oxide.dll compiled successfully.

:done
echo All builds completed.
