@echo off
set CSC=C:\Windows\Microsoft.NET\Framework64\v3.5\csc.exe
if not exist "%CSC%" set CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe

echo [1/2] Compiling RustPilot.Client.dll (.NET 3.5)...
set CLIENT_MANAGED=D:\ai\servers\Rust_Devblog_65\client\RustClient_Data\Managed
"%CSC%" /target:library /optimize+ /unsafe /nowarn:0169,0414,0649,1701,1702,1703 /nostdlib /noconfig ^
  /r:"%CLIENT_MANAGED%\mscorlib.dll" ^
  /r:"%CLIENT_MANAGED%\System.dll" ^
  /r:"%CLIENT_MANAGED%\System.Core.dll" ^
  /r:"%CLIENT_MANAGED%\UnityEngine.dll" ^
  /r:"%CLIENT_MANAGED%\UnityEngine.UI.dll" ^
  /r:"D:\ai\servers\Rust_Devblog_65\client_pristine\Assembly-CSharp.dll" ^
  /r:"%CLIENT_MANAGED%\Assembly-CSharp-firstpass.dll" ^
  /r:"%CLIENT_MANAGED%\Facepunch.UnityEngine.dll" ^
  /r:"%CLIENT_MANAGED%\Facepunch.Network.dll" ^
  /r:"%CLIENT_MANAGED%\Facepunch.Console.dll" ^
  /r:"%CLIENT_MANAGED%\Newtonsoft.Json.dll" ^
  /out:"%CLIENT_MANAGED%\RustPilot.Client.dll" ^
  "d:\ai\apps\RustPilot\RustPilot.Client\ClientModMenu.cs" ^
  "d:\ai\apps\RustPilot\RustPilot.Client\RussianLocalization.cs" ^
  "d:\ai\apps\RustPilot\RustPilot.Client\SteamAuthManager.cs"

if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to compile RustPilot.Client.dll
  exit /b %ERRORLEVEL%
)
echo [OK] RustPilot.Client.dll compiled successfully.

echo [2/3] Weaving classes directly into native Assembly-CSharp.dll...
dotnet run --project "d:\ai\apps\RustPilot\RustPilot.Patcher\RustPilot.Patcher.csproj"
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to patch native Assembly-CSharp.dll
  exit /b %ERRORLEVEL%
)

echo [3/3] Compiling RustPilot.Oxide.dll (.NET 3.5)...
set SERVER_MANAGED=D:\ai\servers\Rust_Devblog_65\server\RustDedicated_Data\Managed
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
  "d:\ai\apps\RustPilot\RustPilot.Oxide\Oxide\Core\Interface.cs" ^
  "d:\ai\apps\RustPilot\RustPilot.Oxide\Oxide\Core\Libraries\Timer.cs" ^
  "d:\ai\apps\RustPilot\RustPilot.Oxide\Oxide\Core\Libraries\Permission.cs" ^
  "d:\ai\apps\RustPilot\RustPilot.Oxide\Oxide\Core\Libraries\Lang.cs" ^
  "d:\ai\apps\RustPilot\RustPilot.Oxide\Oxide\Core\Plugins\Plugin.cs" ^
  "d:\ai\apps\RustPilot\RustPilot.Oxide\Oxide\Core\Plugins\PluginManager.cs" ^
  "d:\ai\apps\RustPilot\RustPilot.Oxide\Oxide\Plugins\RustPlugin.cs" ^
  "d:\ai\apps\RustPilot\RustPilot.Oxide\Oxide\Game\Rust\Cui\CuiHelper.cs"

if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to compile RustPilot.Oxide.dll
  exit /b %ERRORLEVEL%
)
echo [OK] RustPilot.Oxide.dll compiled successfully.
