using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using Oxide.Core.Plugins;

namespace Oxide.Core.Libraries
{
    public class Lang
    {
        private readonly Dictionary<string, Dictionary<string, Dictionary<string, string>>> langData =
            new Dictionary<string, Dictionary<string, Dictionary<string, string>>>(StringComparer.OrdinalIgnoreCase);

        public void RegisterMessages(Dictionary<string, string> messages, Plugin plugin, string lang)
        {
            if (plugin == null || messages == null) return;
            if (string.IsNullOrEmpty(lang)) lang = "en";

            string pluginName = plugin.Name;
            string langDir = Path.Combine(Path.Combine(Interface.Oxide.RootDirectory, "lang"), lang);
            if (!Directory.Exists(langDir)) Directory.CreateDirectory(langDir);
            string filePath = Path.Combine(langDir, string.Format("{0}.json", pluginName));

            Dictionary<string, string> currentMessages = new Dictionary<string, string>(messages);

            if (File.Exists(filePath))
            {
                try
                {
                    Dictionary<string, string> loaded = JsonConvert.DeserializeObject<Dictionary<string, string>>(File.ReadAllText(filePath));
                    if (loaded != null)
                    {
                        foreach (KeyValuePair<string, string> kvp in loaded) currentMessages[kvp.Key] = kvp.Value;
                    }
                }
                catch { }
            }

            try
            {
                File.WriteAllText(filePath, JsonConvert.SerializeObject(currentMessages, Formatting.Indented));
            }
            catch { }

            Dictionary<string, Dictionary<string, string>> langDict;
            if (!langData.TryGetValue(lang, out langDict))
            {
                langDict = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase);
                langData[lang] = langDict;
            }

            langDict[pluginName] = currentMessages;
        }

        public void RegisterMessages(Dictionary<string, string> messages, Plugin plugin)
        {
            RegisterMessages(messages, plugin, "en");
        }

        public string GetMessage(string key, Plugin plugin, string userId)
        {
            if (plugin == null || string.IsNullOrEmpty(key)) return key;

            string lang = "en";
            Dictionary<string, Dictionary<string, string>> langDict;
            if (langData.TryGetValue(lang, out langDict))
            {
                Dictionary<string, string> pluginDict;
                if (langDict.TryGetValue(plugin.Name, out pluginDict))
                {
                    string msg;
                    if (pluginDict.TryGetValue(key, out msg))
                    {
                        return msg;
                    }
                }
            }

            return key;
        }

        public string GetMessage(string key, Plugin plugin)
        {
            return GetMessage(key, plugin, null);
        }
    }
}
