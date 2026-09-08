using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using Newtonsoft.Json;
using Oxide.Core.Libraries;
using UnityEngine;

namespace Oxide.Core.Plugins
{
    [AttributeUsage(AttributeTargets.Class)]
    public class InfoAttribute : Attribute
    {
        public string Title { get; private set; }
        public string Author { get; private set; }
        public string Version { get; private set; }
        public int ResourceId { get; set; }

        public InfoAttribute(string title, string author, string version)
        {
            Title = title;
            Author = author;
            Version = version;
        }
    }

    [AttributeUsage(AttributeTargets.Class)]
    public class DescriptionAttribute : Attribute
    {
        public string Description { get; private set; }

        public DescriptionAttribute(string description)
        {
            Description = description;
        }
    }

    [AttributeUsage(AttributeTargets.Method)]
    public class ChatCommandAttribute : Attribute
    {
        public string Command { get; private set; }

        public ChatCommandAttribute(string command)
        {
            Command = command;
        }
    }

    [AttributeUsage(AttributeTargets.Method)]
    public class ConsoleCommandAttribute : Attribute
    {
        public string Command { get; private set; }

        public ConsoleCommandAttribute(string command)
        {
            Command = command;
        }
    }

    [AttributeUsage(AttributeTargets.Method)]
    public class HookMethodAttribute : Attribute
    {
        public string Name { get; private set; }

        public HookMethodAttribute(string name)
        {
            Name = name;
        }
    }

    public abstract class Plugin
    {
        public string Name { get; set; }
        public string Title { get; set; }
        public string Author { get; set; }
        public string Version { get; set; }
        public string Description { get; set; }
        public int ResourceId { get; set; }

        public Permission permission
        {
            get { return Interface.Oxide.permission; }
        }

        public Timer timer
        {
            get { return Interface.Oxide.timer; }
        }

        public Lang lang
        {
            get { return Interface.Oxide.lang; }
        }

        public DynamicConfigFile Config { get; private set; }

        internal readonly Dictionary<string, MethodInfo> hookMethods = new Dictionary<string, MethodInfo>(StringComparer.OrdinalIgnoreCase);
        internal readonly Dictionary<string, MethodInfo> chatCommands = new Dictionary<string, MethodInfo>(StringComparer.OrdinalIgnoreCase);
        internal readonly Dictionary<string, MethodInfo> consoleCommands = new Dictionary<string, MethodInfo>(StringComparer.OrdinalIgnoreCase);

        public Plugin()
        {
            Name = string.Empty;
            Title = string.Empty;
            Author = string.Empty;
            Version = "1.0.0";
            Description = string.Empty;
            ResourceId = 0;
        }

        public virtual void InitPlugin()
        {
            Name = GetType().Name;
            object[] infoAttrs = GetType().GetCustomAttributes(typeof(InfoAttribute), true);
            if (infoAttrs != null && infoAttrs.Length > 0)
            {
                InfoAttribute info = (InfoAttribute)infoAttrs[0];
                Title = info.Title;
                Author = info.Author;
                Version = info.Version;
                ResourceId = info.ResourceId;
            }
            else
            {
                Title = Name;
                Author = "Unknown";
            }

            object[] descAttrs = GetType().GetCustomAttributes(typeof(DescriptionAttribute), true);
            if (descAttrs != null && descAttrs.Length > 0)
            {
                DescriptionAttribute desc = (DescriptionAttribute)descAttrs[0];
                Description = desc.Description;
            }

            Config = new DynamicConfigFile(Path.Combine(Interface.Oxide.ConfigDirectory, string.Format("{0}.json", Name)));
            LoadDefaultConfig();

            // Cache methods
            foreach (MethodInfo method in GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic))
            {
                hookMethods[method.Name] = method;

                object[] hookAttrs = method.GetCustomAttributes(typeof(HookMethodAttribute), true);
                if (hookAttrs != null && hookAttrs.Length > 0)
                {
                    HookMethodAttribute hookAttr = (HookMethodAttribute)hookAttrs[0];
                    hookMethods[hookAttr.Name] = method;
                }

                object[] chatAttrs = method.GetCustomAttributes(typeof(ChatCommandAttribute), true);
                if (chatAttrs != null && chatAttrs.Length > 0)
                {
                    ChatCommandAttribute chatAttr = (ChatCommandAttribute)chatAttrs[0];
                    chatCommands[chatAttr.Command] = method;
                }

                object[] consoleAttrs = method.GetCustomAttributes(typeof(ConsoleCommandAttribute), true);
                if (consoleAttrs != null && consoleAttrs.Length > 0)
                {
                    ConsoleCommandAttribute consoleAttr = (ConsoleCommandAttribute)consoleAttrs[0];
                    consoleCommands[consoleAttr.Command] = method;
                }
            }
        }

        public virtual void LoadDefaultConfig()
        {
            Config.Load();
        }

        public void SaveConfig()
        {
            Config.Save();
        }

        public void Puts(string message)
        {
            Debug.Log(string.Format("[{0}] {1}", Name, message));
        }

        public void PrintWarning(string message)
        {
            Debug.LogWarning(string.Format("[{0}] {1}", Name, message));
        }

        public void PrintError(string message)
        {
            Debug.LogError(string.Format("[{0}] {1}", Name, message));
        }

        public MethodInfo FindChatCommand(string command)
        {
            MethodInfo m;
            chatCommands.TryGetValue(command, out m);
            return m;
        }

        public object CallHook(string name, object[] args)
        {
            MethodInfo method;
            if (hookMethods.TryGetValue(name, out method))
            {
                try
                {
                    ParameterInfo[] parameters = method.GetParameters();
                    if (parameters.Length == 0)
                    {
                        return method.Invoke(this, null);
                    }

                    object[] passArgs = new object[parameters.Length];
                    for (int i = 0; i < parameters.Length; i++)
                    {
                        if (args != null && i < args.Length)
                        {
                            passArgs[i] = args[i];
                        }
                    }
                    return method.Invoke(this, passArgs);
                }
                catch (Exception ex)
                {
                    PrintError(string.Format("Exception in hook {0}: {1}", name, ex.InnerException ?? ex));
                }
            }
            return null;
        }

        public virtual void Unload() { }
    }

    public class DynamicConfigFile
    {
        public string Filename { get; private set; }
        private Dictionary<string, object> data = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

        public DynamicConfigFile(string filename)
        {
            Filename = filename;
        }

        public object this[string key]
        {
            get
            {
                object val;
                return data.TryGetValue(key, out val) ? val : null;
            }
            set { data[key] = value; }
        }

        public T Get<T>(string key, T defaultValue)
        {
            object val;
            if (data.TryGetValue(key, out val) && val is T)
            {
                return (T)val;
            }
            return defaultValue;
        }

        public void Load()
        {
            try
            {
                if (File.Exists(Filename))
                {
                    Dictionary<string, object> loaded = JsonConvert.DeserializeObject<Dictionary<string, object>>(File.ReadAllText(Filename));
                    if (loaded != null) data = loaded;
                }
            }
            catch { }
        }

        public void Save()
        {
            try
            {
                string dir = Path.GetDirectoryName(Filename);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.WriteAllText(Filename, JsonConvert.SerializeObject(data, Formatting.Indented));
            }
            catch { }
        }
    }
}
