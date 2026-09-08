using System;
using System.Collections.Generic;
using Network;
using Newtonsoft.Json;
using UnityEngine;

namespace Oxide.Game.Rust.Cui
{
    public static class CuiHelper
    {
        public static string ToJson(List<CuiElement> elements, bool format)
        {
            return JsonConvert.SerializeObject(elements, format ? Formatting.Indented : Formatting.None);
        }

        public static string ToJson(List<CuiElement> elements)
        {
            return ToJson(elements, false);
        }

        public static List<CuiElement> FromJson(string json)
        {
            List<CuiElement> list = JsonConvert.DeserializeObject<List<CuiElement>>(json);
            return list != null ? list : new List<CuiElement>();
        }

        public static bool AddUi(BasePlayer player, List<CuiElement> elements)
        {
            return AddUi(player, ToJson(elements));
        }

        public static bool AddUi(BasePlayer player, string json)
        {
            if (player == null || player.net == null || player.net.connection == null) return false;
            if (CommunityEntity.ServerInstance != null)
            {
                CommunityEntity.ServerInstance.ClientRPCEx(
                    new SendInfo { connection = player.net.connection },
                    null,
                    "AddUI",
                    new Facepunch.ObjectList?(new Facepunch.ObjectList(json, null, null, null, null))
                );
                return true;
            }
            return false;
        }

        public static bool DestroyUi(BasePlayer player, string elemName)
        {
            if (player == null || player.net == null || player.net.connection == null) return false;
            if (CommunityEntity.ServerInstance != null)
            {
                CommunityEntity.ServerInstance.ClientRPCEx(
                    new SendInfo { connection = player.net.connection },
                    null,
                    "DestroyUI",
                    new Facepunch.ObjectList?(new Facepunch.ObjectList(elemName, null, null, null, null))
                );
                return true;
            }
            return false;
        }

        public static string GetGuid()
        {
            return Guid.NewGuid().ToString("N");
        }
    }

    public class CuiElement
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("parent")]
        public string Parent { get; set; }

        [JsonProperty("components")]
        public List<ICuiComponent> Components { get; set; }

        [JsonProperty("fadeOut")]
        public float FadeOut { get; set; }

        public CuiElement()
        {
            Name = string.Empty;
            Parent = "Overlay";
            Components = new List<ICuiComponent>();
            FadeOut = 0f;
        }
    }

    public interface ICuiComponent
    {
        [JsonProperty("type")]
        string Type { get; }
    }

    public class CuiPanel : ICuiComponent
    {
        public string Type
        {
            get { return "UnityEngine.UI.Image"; }
        }

        [JsonProperty("color")]
        public string Color { get; set; }

        [JsonProperty("material")]
        public string Material { get; set; }

        [JsonProperty("fadeIn")]
        public float FadeIn { get; set; }

        [JsonProperty("cursor")]
        public bool Cursor { get; set; }

        public CuiPanel()
        {
            Color = "0 0 0 0.8";
            Material = string.Empty;
            FadeIn = 0f;
            Cursor = false;
        }
    }

    public class CuiButton : ICuiComponent
    {
        public string Type
        {
            get { return "UnityEngine.UI.Button"; }
        }

        [JsonProperty("command")]
        public string Command { get; set; }

        [JsonProperty("close")]
        public string Close { get; set; }

        [JsonProperty("color")]
        public string Color { get; set; }

        [JsonProperty("material")]
        public string Material { get; set; }

        [JsonProperty("fadeIn")]
        public float FadeIn { get; set; }

        public CuiButton()
        {
            Command = string.Empty;
            Close = string.Empty;
            Color = "0.8 0.2 0.1 1.0";
            Material = string.Empty;
            FadeIn = 0f;
        }
    }

    public class CuiLabel : ICuiComponent
    {
        public string Type
        {
            get { return "UnityEngine.UI.Text"; }
        }

        [JsonProperty("text")]
        public string Text { get; set; }

        [JsonProperty("fontSize")]
        public int FontSize { get; set; }

        [JsonProperty("font")]
        public string Font { get; set; }

        [JsonProperty("align")]
        public TextAnchor Align { get; set; }

        [JsonProperty("color")]
        public string Color { get; set; }

        [JsonProperty("fadeIn")]
        public float FadeIn { get; set; }

        public CuiLabel()
        {
            Text = string.Empty;
            FontSize = 14;
            Font = "RobotoCondensed-Bold.ttf";
            Align = TextAnchor.MiddleCenter;
            Color = "1 1 1 1";
            FadeIn = 0f;
        }
    }

    public class CuiRectTransform : ICuiComponent
    {
        public string Type
        {
            get { return "RectTransform"; }
        }

        [JsonProperty("anchormin")]
        public string AnchorMin { get; set; }

        [JsonProperty("anchormax")]
        public string AnchorMax { get; set; }

        [JsonProperty("offsetmin")]
        public string OffsetMin { get; set; }

        [JsonProperty("offsetmax")]
        public string OffsetMax { get; set; }

        public CuiRectTransform()
        {
            AnchorMin = "0 0";
            AnchorMax = "1 1";
            OffsetMin = "0 0";
            OffsetMax = "0 0";
        }
    }

    public class CuiNeedsCursor : ICuiComponent
    {
        public string Type
        {
            get { return "NeedsCursor"; }
        }
    }
}
