using System;
using System.IO;
using UnityEngine;

namespace Oxide.Core
{
    public struct VersionNumber : IComparable<VersionNumber>
    {
        public int Major;
        public int Minor;
        public int Patch;

        public VersionNumber(int major, int minor, int patch)
        {
            Major = major;
            Minor = minor;
            Patch = patch;
        }

        public override string ToString()
        {
            return string.Format("{0}.{1}.{2}", Major, Minor, Patch);
        }

        public int CompareTo(VersionNumber other)
        {
            if (Major != other.Major) return Major.CompareTo(other.Major);
            if (Minor != other.Minor) return Minor.CompareTo(other.Minor);
            return Patch.CompareTo(other.Patch);
        }
    }

    public class OxideMod
    {
        public static readonly VersionNumber Version = new VersionNumber(2, 0, 4000);

        public string RootDirectory { get; private set; }
        public string PluginDirectory { get; private set; }
        public string ConfigDirectory { get; private set; }
        public string DataDirectory { get; private set; }
        public string LogDirectory { get; private set; }

        public Plugins.PluginManager RootPluginManager { get; private set; }
        public Libraries.Permission permission { get; private set; }
        public Libraries.Timer timer { get; private set; }
        public Libraries.Lang lang { get; private set; }

        public bool IsLoaded { get; private set; }

        public OxideMod()
        {
            RootDirectory = string.Empty;
            PluginDirectory = string.Empty;
            ConfigDirectory = string.Empty;
            DataDirectory = string.Empty;
            LogDirectory = string.Empty;
            IsLoaded = false;
        }

        public void Load()
        {
            if (IsLoaded) return;

            Debug.Log("[Oxide] OxideMod.Load() is executing...");

            string appDir = "D:\\ai\\servers\\Rust_Devblog_65\\server";
            string bootLog = Path.Combine(appDir, "oxide_boot.log");

            try
            {
                File.AppendAllText(bootLog, string.Format("[{0:HH:mm:ss}] OxideMod.Load() called. AppDir: {1}\r\n", DateTime.Now, appDir));

                RootDirectory = Path.Combine(appDir, "oxide");
                PluginDirectory = Path.Combine(RootDirectory, "plugins");
                ConfigDirectory = Path.Combine(RootDirectory, "config");
                DataDirectory = Path.Combine(RootDirectory, "data");
                LogDirectory = Path.Combine(RootDirectory, "logs");

                if (!Directory.Exists(RootDirectory)) Directory.CreateDirectory(RootDirectory);
                if (!Directory.Exists(PluginDirectory)) Directory.CreateDirectory(PluginDirectory);
                if (!Directory.Exists(ConfigDirectory)) Directory.CreateDirectory(ConfigDirectory);
                if (!Directory.Exists(DataDirectory)) Directory.CreateDirectory(DataDirectory);
                if (!Directory.Exists(LogDirectory)) Directory.CreateDirectory(LogDirectory);

                permission = new Libraries.Permission();
                timer = new Libraries.Timer();
                lang = new Libraries.Lang();
                RootPluginManager = new Plugins.PluginManager(this);

                IsLoaded = true;

                Debug.Log(string.Format("[Oxide] Oxide.Rust v{0} loaded successfully.", Version));
                Debug.Log(string.Format("[Oxide] Plugin directory: {0}", PluginDirectory));

                File.AppendAllText(bootLog, string.Format("[{0:HH:mm:ss}] Oxide initialized. Loading plugins...\r\n", DateTime.Now));

                // Register native commands
                RegisterCommands();

                // Load all plugins
                RootPluginManager.LoadAllPlugins();

                File.AppendAllText(bootLog, string.Format("[{0:HH:mm:ss}] Plugins loaded successfully.\r\n", DateTime.Now));
            }
            catch (Exception ex)
            {
                File.AppendAllText(bootLog, string.Format("[{0:HH:mm:ss}] Exception in OxideMod.Load: {1}\r\n", DateTime.Now, ex));
                Debug.LogError(string.Format("[Oxide] Failed to load Oxide: {0}", ex));
            }
        }

        public void OnFrame(float delta)
        {
            if (!IsLoaded) return;
            try
            {
                timer.Update(delta);
            }
            catch (Exception ex)
            {
                LogError(string.Format("[Oxide] Error in OnFrame: {0}", ex));
            }
        }

        public object CallHook(string hookName, params object[] args)
        {
            if (!IsLoaded || RootPluginManager == null) return null;
            return RootPluginManager.CallHook(hookName, args);
        }

        public void LogInfo(string message)
        {
            Debug.Log(message);
            LogToFile("INFO", message);
        }

        public void LogWarning(string message)
        {
            Debug.LogWarning(message);
            LogToFile("WARNING", message);
        }

        public void LogError(string message)
        {
            Debug.LogError(message);
            LogToFile("ERROR", message);
        }

        private void LogToFile(string level, string message)
        {
            try
            {
                if (string.IsNullOrEmpty(LogDirectory)) return;
                string logFile = Path.Combine(LogDirectory, string.Format("oxide_{0:yyyy-MM-dd}.log", DateTime.Now));
                string line = string.Format("[{0:HH:mm:ss}] [{1}] {2}\r\n", DateTime.Now, level, message);
                File.AppendAllText(logFile, line);
            }
            catch { }
        }

        private void RegisterCommands()
        {
        }
    }

    public static class Interface
    {
        public static OxideMod Oxide { get; private set; }

        public static void Initialize()
        {
            try
            {
                if (Oxide == null)
                {
                    Oxide = new OxideMod();
                    Oxide.Load();
                }
            }
            catch (Exception ex)
            {
                Debug.LogError("[Oxide] ERROR in Interface.Initialize(): " + ex);
            }
        }

        public static void OnFrame(float delta)
        {
            if (Oxide == null)
            {
                Initialize();
            }
            if (Oxide != null)
            {
                Oxide.OnFrame(delta);
            }
        }

        public static object CallHook(string hookName, params object[] args)
        {
            if (Oxide == null) return null;
            return Oxide.CallHook(hookName, args);
        }

        public static bool DispatchChatCommand(BasePlayer player, string message)
        {
            if (Oxide == null || Oxide.RootPluginManager == null) return false;
            return Oxide.RootPluginManager.DispatchChatCommand(player, message);
        }
    }
}
