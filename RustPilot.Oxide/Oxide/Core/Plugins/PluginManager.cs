using System;
using System.CodeDom.Compiler;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using Microsoft.CSharp;

namespace Oxide.Core.Plugins
{
    public class PluginManager
    {
        private readonly OxideMod oxide;
        private readonly Dictionary<string, Plugin> loadedPlugins;
        private FileSystemWatcher fileWatcher;

        public PluginManager(OxideMod oxide)
        {
            this.oxide = oxide;
            this.loadedPlugins = new Dictionary<string, Plugin>(StringComparer.OrdinalIgnoreCase);
            SetupWatcher();
        }

        private void SetupWatcher()
        {
            try
            {
                if (string.IsNullOrEmpty(oxide.PluginDirectory) || !Directory.Exists(oxide.PluginDirectory)) return;

                fileWatcher = new FileSystemWatcher(oxide.PluginDirectory, "*.cs");
                fileWatcher.NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.CreationTime;
                fileWatcher.Changed += OnPluginFileChanged;
                fileWatcher.Created += OnPluginFileChanged;
                fileWatcher.EnableRaisingEvents = true;
            }
            catch (Exception ex)
            {
                try { oxide.LogWarning(string.Format("[Oxide] Failed to setup FileSystemWatcher: {0}", ex.Message)); } catch { }
            }
        }

        private void OnPluginFileChanged(object sender, FileSystemEventArgs e)
        {
            try
            {
                string name = Path.GetFileNameWithoutExtension(e.Name);
                oxide.timer.Once(0.5f, delegate()
                {
                    ReloadPlugin(name);
                });
            }
            catch { }
        }

        public void LoadAllPlugins()
        {
            if (!Directory.Exists(oxide.PluginDirectory)) return;

            string[] files = Directory.GetFiles(oxide.PluginDirectory, "*.cs");
            oxide.LogInfo(string.Format("[Oxide] Loading {0} plugin(s)...", files.Length));

            foreach (string file in files)
            {
                string name = Path.GetFileNameWithoutExtension(file);
                LoadPlugin(name);
            }
        }

        public bool LoadPlugin(string name)
        {
            string filePath = Path.Combine(oxide.PluginDirectory, string.Format("{0}.cs", name));
            if (!File.Exists(filePath))
            {
                oxide.LogWarning(string.Format("[Oxide] Plugin file not found: {0}", filePath));
                return false;
            }

            try
            {
                string sourceCode = File.ReadAllText(filePath);
                Assembly assembly = CompilePlugin(name, sourceCode);
                if (assembly == null) return false;

                foreach (Type type in assembly.GetExportedTypes())
                {
                    if (typeof(Plugin).IsAssignableFrom(type) && !type.IsAbstract)
                    {
                        Plugin oldPlugin;
                        if (loadedPlugins.TryGetValue(name, out oldPlugin))
                        {
                            oldPlugin.Unload();
                            loadedPlugins.Remove(name);
                        }

                        Plugin plugin = (Plugin)Activator.CreateInstance(type);
                        plugin.InitPlugin();
                        loadedPlugins[name] = plugin;

                        oxide.LogInfo(string.Format("[Oxide] Loaded plugin {0} v{1} by {2}", plugin.Title, plugin.Version, plugin.Author));

                        plugin.CallHook("Loaded", new object[0]);
                        if (LevelManager.isLoaded)
                        {
                            plugin.CallHook("OnServerInitialized", new object[0]);
                        }
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                oxide.LogError(string.Format("[Oxide] Failed to load plugin {0}: {1}", name, ex));
            }

            return false;
        }

        public bool ReloadPlugin(string name)
        {
            oxide.LogInfo(string.Format("[Oxide] Reloading plugin {0}...", name));
            UnloadPlugin(name);
            return LoadPlugin(name);
        }

        public bool UnloadPlugin(string name)
        {
            Plugin plugin;
            if (loadedPlugins.TryGetValue(name, out plugin))
            {
                plugin.Unload();
                loadedPlugins.Remove(name);
                oxide.LogInfo(string.Format("[Oxide] Unloaded plugin {0}", name));
                return true;
            }
            return false;
        }

        public Plugin GetPlugin(string name)
        {
            Plugin plugin;
            loadedPlugins.TryGetValue(name, out plugin);
            return plugin;
        }

        public List<Plugin> GetLoadedPlugins()
        {
            return new List<Plugin>(loadedPlugins.Values);
        }

        public object CallHook(string hookName, params object[] args)
        {
            object lastResult = null;

            foreach (Plugin plugin in loadedPlugins.Values)
            {
                try
                {
                    object result = plugin.CallHook(hookName, args);
                    if (result != null)
                    {
                        lastResult = result;
                    }
                }
                catch (Exception ex)
                {
                    oxide.LogError(string.Format("[Oxide] Error in hook {0} for plugin {1}: {2}", hookName, plugin.Name, ex.InnerException ?? ex));
                }
            }

            return lastResult;
        }

        public bool DispatchChatCommand(BasePlayer player, string message)
        {
            if (string.IsNullOrEmpty(message)) return false;
            string raw = message.Trim();
            if (raw.StartsWith("/") || raw.StartsWith("\\"))
            {
                raw = raw.Substring(1).Trim();
            }
            else
            {
                return false;
            }

            if (string.IsNullOrEmpty(raw)) return false;

            string[] parts = raw.Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return false;

            string command = parts[0].ToLowerInvariant();
            string[] args = new string[Math.Max(0, parts.Length - 1)];
            for (int i = 1; i < parts.Length; i++)
            {
                args[i - 1] = parts[i];
            }

            oxide.LogInfo(string.Format("[Oxide] Player {0} executed chat command: /{1}", player != null ? player.displayName : "Unknown", raw));

            if (command == "plugins" || command == "oxide.plugins")
            {
                PrintPluginsList(player);
                return true;
            }

            foreach (Plugin plugin in loadedPlugins.Values)
            {
                MethodInfo method = plugin.FindChatCommand(command);
                if (method != null)
                {
                    try
                    {
                        ParameterInfo[] parameters = method.GetParameters();
                        if (parameters.Length == 3)
                        {
                            method.Invoke(plugin, new object[] { player, command, args });
                        }
                        else if (parameters.Length == 2)
                        {
                            method.Invoke(plugin, new object[] { player, command });
                        }
                        else if (parameters.Length == 1)
                        {
                            method.Invoke(plugin, new object[] { player });
                        }
                        else
                        {
                            method.Invoke(plugin, null);
                        }
                        return true;
                    }
                    catch (Exception ex)
                    {
                        oxide.LogError(string.Format("[Oxide] Error executing chat command '{0}' in {1}: {2}", command, plugin.Name, ex.InnerException ?? ex));
                        return true;
                    }
                }
            }

            if (player != null)
            {
                player.SendConsoleCommand("chat.add", new object[] { 0UL, string.Format("<color=#ff4444>[Oxide]</color> Неизвестная команда '/{0}'. Введите <color=#55ff55>/help</color> для списка команд.", command), 1f });
            }
            return true;
        }

        private void PrintPluginsList(BasePlayer player)
        {
            if (player == null) return;
            player.SendConsoleCommand("chat.add", new object[] { 0UL, string.Format("<color=#00e5ff>[Oxide]</color> Listing {0} plugin(s):", loadedPlugins.Count), 1f });
            int idx = 1;
            foreach (Plugin plugin in loadedPlugins.Values)
            {
                player.SendConsoleCommand("chat.add", new object[] { 0UL, string.Format("<color=#ffff00>{0:D2}</color> \"{1}\" ({2}) by {3}", idx++, plugin.Title, plugin.Version, plugin.Author), 1f });
            }
        }

        private Assembly CompilePlugin(string pluginName, string sourceCode)
        {
            string managedDir = @"D:\ai\servers\Rust_Devblog_65\server\RustDedicated_Data\Managed";
            if (!Directory.Exists(managedDir))
            {
                managedDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "RustDedicated_Data\\Managed");
            }
            string tempDir = Path.Combine(oxide.DataDirectory, ".compiled");
            if (!Directory.Exists(tempDir)) Directory.CreateDirectory(tempDir);
            string outDll = Path.Combine(tempDir, string.Format("{0}.dll", pluginName));
            string sourceFile = Path.Combine(tempDir, string.Format("{0}.cs", pluginName));
            File.WriteAllText(sourceFile, sourceCode);

            string[] referenceDlls = new string[]
            {
                "UnityEngine.dll",
                "UnityEngine.UI.dll",
                "Assembly-CSharp.dll",
                "Assembly-CSharp-firstpass.dll",
                "Facepunch.Network.dll",
                "Facepunch.Console.dll",
                "Newtonsoft.Json.dll",
                "protobuf-net.dll",
                "RustPilot.Oxide.dll"
            };

            List<string> refs = new List<string>();
            foreach (string dll in referenceDlls)
            {
                string path = Path.Combine(managedDir, dll);
                if (File.Exists(path))
                {
                    refs.Add(path);
                }
            }

            // Method 1: Try External csc.exe (.NET 3.5 native)
            string cscPath = @"C:\Windows\Microsoft.NET\Framework64\v3.5\csc.exe";
            if (!File.Exists(cscPath)) cscPath = @"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe";
            if (!File.Exists(cscPath)) cscPath = @"C:\Windows\Microsoft.NET\Framework\v3.5\csc.exe";

            if (File.Exists(cscPath))
            {
                try
                {
                    if (File.Exists(outDll)) File.Delete(outDll);

                    List<string> quotedRefs = new List<string>();
                    foreach (string r in refs) quotedRefs.Add(string.Format("/reference:\"{0}\"", r));
                    string refArgs = string.Join(" ", quotedRefs.ToArray());

                    System.Diagnostics.ProcessStartInfo psi = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = cscPath,
                        Arguments = string.Format("/target:library /optimize+ /unsafe /nowarn:0169,0414,0649,1701,1702 /out:\"{0}\" {1} \"{2}\"", outDll, refArgs, sourceFile),
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };

                    using (System.Diagnostics.Process proc = System.Diagnostics.Process.Start(psi))
                    {
                        if (proc != null)
                        {
                            string stdout = proc.StandardOutput.ReadToEnd();
                            string stderr = proc.StandardError.ReadToEnd();
                            proc.WaitForExit();

                            if (proc.ExitCode == 0 && File.Exists(outDll))
                            {
                                byte[] assemblyBytes = File.ReadAllBytes(outDll);
                                return Assembly.Load(assemblyBytes);
                            }
                            else
                            {
                                oxide.LogError(string.Format("[Oxide] Compilation failed for {0}.cs (ExitCode {1}):", pluginName, proc.ExitCode));
                                if (!string.IsNullOrEmpty(stdout)) oxide.LogError(stdout);
                                if (!string.IsNullOrEmpty(stderr)) oxide.LogError(stderr);
                                return null;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    oxide.LogWarning(string.Format("[Oxide] External csc compiler failed, falling back to CodeDom: {0}", ex.Message));
                }
            }

            // Method 2: Fallback to CodeDom CSharpCodeProvider
            try
            {
                Dictionary<string, string> providerOptions = new Dictionary<string, string>();
                providerOptions["CompilerVersion"] = "v3.5";
                using (CSharpCodeProvider csharpProvider = new CSharpCodeProvider(providerOptions))
                {
                    CompilerParameters compilerParams = new CompilerParameters
                    {
                        GenerateInMemory = true,
                        GenerateExecutable = false,
                        TreatWarningsAsErrors = false
                    };
                    foreach (string r in refs) compilerParams.ReferencedAssemblies.Add(r);

                    CompilerResults results = csharpProvider.CompileAssemblyFromSource(compilerParams, sourceCode);
                    if (results.Errors.HasErrors)
                    {
                        oxide.LogError(string.Format("[Oxide] CodeDom compilation error in {0}.cs:", pluginName));
                        foreach (CompilerError error in results.Errors)
                        {
                            if (!error.IsWarning) oxide.LogError(string.Format("  Line {0}, Column {1}: {2}", error.Line, error.Column, error.ErrorText));
                        }
                        return null;
                    }
                    return results.CompiledAssembly;
                }
            }
            catch (Exception ex)
            {
                oxide.LogError(string.Format("[Oxide] All compilation methods failed for {0}: {1}", pluginName, ex));
                return null;
            }
        }
    }
}
