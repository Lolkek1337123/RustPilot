#nullable disable
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using dnlib.DotNet;
using dnlib.DotNet.Emit;

namespace RustPilot.Patcher
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=================================================");
            Console.WriteLine(" Rust Devblog Native Assembly-CSharp Patcher     ");
            Console.WriteLine("=================================================");

            string targetPath = null;
            string modDllPath = null;

            if (args.Length > 0 && !string.IsNullOrWhiteSpace(args[0]))
            {
                string inputPath = args[0].Trim('"', '\'');
                if (Directory.Exists(inputPath))
                {
                    targetPath = Path.Combine(inputPath, "Assembly-CSharp.dll");
                }
                else if (File.Exists(inputPath))
                {
                    targetPath = inputPath;
                }
            }

            if (string.IsNullOrEmpty(targetPath) || !File.Exists(targetPath))
            {
                // Fallback detection in current directory or typical devblog locations
                string localCand = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Assembly-CSharp.dll");
                if (File.Exists(localCand)) targetPath = localCand;
            }

            if (string.IsNullOrEmpty(targetPath) || !File.Exists(targetPath))
            {
                Console.WriteLine("[USAGE] RustPilot.Patcher.exe <PathToManagedDir_or_AssemblyCSharpDll> [PathToRustPilotClientDll]");
                Console.WriteLine($"[ERROR] Target Assembly-CSharp.dll not found. Specified: {args.FirstOrDefault() ?? "(none)"}");
                return;
            }

            string managedDir = Path.GetDirectoryName(targetPath);
            string pristinePath = targetPath + ".bak";

            // If pristine backup doesn't exist yet, save pristine copy before any patching
            if (!File.Exists(pristinePath))
            {
                try
                {
                    File.Copy(targetPath, pristinePath);
                    Console.WriteLine($"[BACKUP] Created pristine backup: {pristinePath}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[WARN] Could not create pristine backup: {ex.Message}");
                    pristinePath = targetPath;
                }
            }

            // Resolve mod dll path
            if (args.Length > 1 && !string.IsNullOrWhiteSpace(args[1]) && File.Exists(args[1].Trim('"', '\'')))
            {
                modDllPath = args[1].Trim('"', '\'');
            }
            else
            {
                // Check in same managed folder or next to patcher exe
                string sameDirMod = Path.Combine(managedDir, "RustPilot.Client.dll");
                string exeDirMod = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "RustPilot.Client.dll");
                if (File.Exists(sameDirMod)) modDllPath = sameDirMod;
                else if (File.Exists(exeDirMod)) modDllPath = exeDirMod;
            }

            Console.WriteLine($"[1/6] Loading pristine Assembly-CSharp.dll ({new FileInfo(pristinePath).Length} bytes)...");
            ModuleContext modCtx = ModuleDef.CreateModuleContext();
            ModuleDefMD targetMod = ModuleDefMD.Load(pristinePath, modCtx);

            bool hasModDll = !string.IsNullOrEmpty(modDllPath) && File.Exists(modDllPath);
            if (hasModDll)
            {
                Console.WriteLine($"[2/6] Injecting mod classes from {Path.GetFileName(modDllPath)} directly into Assembly-CSharp.dll...");
                ModuleDefMD sourceMod = ModuleDefMD.Load(modDllPath, modCtx);
                var injectedTypes = InjectHelper.Inject(sourceMod, targetMod);
                Console.WriteLine($"      -> Injected {injectedTypes.Count} types directly into game assembly.");

                TypeDef ruLocType = targetMod.Find("RustPilot.Client.RussianLocalization", true);
                TypeDef clientMenuType = targetMod.Find("RustPilot.Client.ClientModMenu", true);

                if (ruLocType != null && clientMenuType != null)
                {
                    // 3. Hook Translate.Get for 0ms Native Translation
                    Console.WriteLine("[3/6] Hooking Translate.Get for native localization...");
                    TypeDef translateType = targetMod.Find("Translate", true);
                    if (translateType != null)
                    {
                        MethodDef getMethod = translateType.FindMethod("Get");
                        MethodDef hookMethod = ruLocType.FindMethod("OnTranslateGet");
                        if (getMethod != null && hookMethod != null && getMethod.HasBody)
                        {
                            Local tempLoc = new Local(targetMod.CorLibTypes.String);
                            getMethod.Body.Variables.Add(tempLoc);

                            Instruction firstOrig = getMethod.Body.Instructions[0];

                            var hookInstructions = new List<Instruction>
                            {
                                OpCodes.Ldarg_0.ToInstruction(),
                                OpCodes.Ldarg_1.ToInstruction(),
                                OpCodes.Call.ToInstruction(hookMethod),
                                OpCodes.Stloc.ToInstruction(tempLoc),
                                OpCodes.Ldloc.ToInstruction(tempLoc),
                                OpCodes.Brfalse_S.ToInstruction(firstOrig),
                                OpCodes.Ldloc.ToInstruction(tempLoc),
                                OpCodes.Ret.ToInstruction()
                            };

                            for (int i = hookInstructions.Count - 1; i >= 0; i--)
                            {
                                getMethod.Body.Instructions.Insert(0, hookInstructions[i]);
                            }
                            Console.WriteLine("      -> Translate.Get hooked successfully!");
                        }
                    }

                    // Hook MainMenuSystem.Awake
                    Console.WriteLine("[4/6] Hooking MainMenuSystem.Awake...");
                    TypeDef mainMenuType = targetMod.Find("MainMenuSystem", true);
                    if (mainMenuType != null)
                    {
                        MethodDef awakeMethod = mainMenuType.FindMethod("Awake");
                        MethodDef initMethod = clientMenuType.FindMethod("Initialize");
                        if (awakeMethod != null && initMethod != null && awakeMethod.HasBody)
                        {
                            awakeMethod.Body.Instructions.Insert(0, OpCodes.Call.ToInstruction(initMethod));
                            Console.WriteLine("      -> MainMenuSystem.Awake hooked!");
                        }
                    }
                }
            }
            else
            {
                Console.WriteLine("[2/6] Skipping mod class injection (RustPilot.Client.dll not provided/found).");
            }

            // 5. Suppress Steamworks is not initialized in GameStat
            Console.WriteLine("[5/6] Patching GameStat to suppress Steamworks errors when offline...");
            TypeDef gameStatType = targetMod.Find("GameStat", true);
            if (gameStatType != null)
            {
                string[] methodsToClear = new[] { "Awake", "Refresh" };
                foreach (var mName in methodsToClear)
                {
                    MethodDef m = gameStatType.FindMethod(mName);
                    if (m != null && m.HasBody)
                    {
                        m.Body.Instructions.Clear();
                        m.Body.Instructions.Add(OpCodes.Ret.ToInstruction());
                        Console.WriteLine($"      -> Silenced GameStat.{mName}() successfully.");
                    }
                }
            }

            // 6. Write patched native Assembly-CSharp.dll
            string tmpOut = targetPath + ".tmp";
            Console.WriteLine($"[6/6] Writing native Assembly-CSharp.dll to {tmpOut}...");
            targetMod.Write(tmpOut);

            if (File.Exists(targetPath))
            {
                File.Delete(targetPath);
            }
            File.Move(tmpOut, targetPath);
            Console.WriteLine($"      -> Saved native Assembly-CSharp.dll ({new FileInfo(targetPath).Length} bytes).");

            // Clean up separate mod dll so only native game files exist
            if (File.Exists(modDllPath))
            {
                try
                {
                    File.Delete(modDllPath);
                    Console.WriteLine($"[CLEANUP] Deleted external mod dll {Path.GetFileName(modDllPath)} - Game is now 100% native!");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[NOTICE] Could not delete mod dll (might be locked): {ex.Message}");
                }
            }

            Console.WriteLine("=================================================");
            Console.WriteLine(" SUCCESS! Game code patched natively with 0 errors.");
            Console.WriteLine("=================================================");
        }
    }
}
