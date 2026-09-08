using System;
using Oxide.Core.Plugins;
using UnityEngine;

namespace Oxide.Plugins
{
    public abstract class RustPlugin : Plugin
    {
        public void PrintToChat(BasePlayer player, string message, string prefix)
        {
            if (player == null || player.net == null) return;
            string text = string.IsNullOrEmpty(prefix) ? message : string.Format("{0} {1}", prefix, message);
            player.SendConsoleCommand("chat.add", new object[] { 0UL, text, 1f });
        }

        public void PrintToChat(BasePlayer player, string message)
        {
            PrintToChat(player, message, string.Empty);
        }

        public void PrintToChat(string message, string prefix)
        {
            string text = string.IsNullOrEmpty(prefix) ? message : string.Format("{0} {1}", prefix, message);
            ConVar.Chat.Broadcast(text, "SERVER", "#eee", 0UL);
        }

        public void PrintToChat(string message)
        {
            PrintToChat(message, string.Empty);
        }

        public void PrintToConsole(BasePlayer player, string message)
        {
            if (player == null || player.net == null) return;
            player.SendConsoleCommand("echo", message);
        }

        public void SendReply(BasePlayer player, string message)
        {
            PrintToChat(player, message);
        }

        public void SendReply(ConsoleSystem.Arg arg, string message)
        {
            if (arg.Player() != null)
            {
                SendReply(arg.Player(), message);
            }
            else
            {
                arg.ReplyWith(message);
            }
        }
    }
}
