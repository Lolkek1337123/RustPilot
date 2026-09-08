using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Sockets;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace RustPilot.Client
{
    /// <summary>
    /// RustPilot Client Mod for Rust Devblog 65.
    /// Integrates 100% native Unity UI components directly into the game's Canvas:
    /// - Left Column:
    ///   1. Player Profile (AboutYou)
    ///   2. Middle: Scrollable Server List (Between Profile & Launcher Online)
    ///   3. Bottom: Launcher Online Players indicator (Replacing Friends List)
    /// - Center Column: Native Devblog 65 Project News (NewsSource)
    /// - In-game Native Settings Tab ("TRP ТВИКИ")
    /// Author: TEAM_RUST_PLUGINS
    /// </summary>
    public class ClientModMenu : MonoBehaviour
    {
        public static ClientModMenu Instance { get; private set; }

        public static void Initialize()
        {
            if (Instance != null) return;

            try
            {
                Cursor.visible = true;
                Cursor.lockState = CursorLockMode.None;
                GameObject go = new GameObject("RustPilot_ClientModMenu");
                UnityEngine.Object.DontDestroyOnLoad(go);
                Instance = go.AddComponent<ClientModMenu>();
                Debug.Log("[RustPilot] ClientModMenu attached to GameObject. Awaiting MainMenu ready...");
            }
            catch (Exception ex)
            {
                Debug.LogError("[RustPilot] Failed to initialize ClientModMenu: " + ex);
            }
        }

        // State
        public bool isVisible = false;
        private int activeTab = 0;
        private readonly string[] tabNames = new string[] { "ОКРУЖЕНИЕ", "КАМЕРА / ЗУМ", "FPS BOOST", "ПРИЦЕЛ", "О МОДЕ" };

        // Settings
        public bool grassEnabled = true;
        public float grassQuality = 100f;
        public bool grassDisplacement = true;
        public float decorQuality = 100f;
        public float treeQuality = 100f;

        public float fov = 85f;
        public float originalFov = 85f;
        public bool zoomEnabled = true;
        public KeyCode zoomKey = KeyCode.Z;
        public float zoomFov = 25f;
        private bool isZooming = false;

        public bool shadowsEnabled = true;
        public float shadowDistance = 80f;
        public bool dofEnabled = false;
        public bool waterReflections = false;
        public int fpsLimit = 144;
        public bool showFpsOverlay = false;
        public bool fullBright = false;

        public bool crosshairEnabled = false;
        public Color crosshairColor = Color.green;
        public int crosshairSize = 4;
        public int crosshairGap = 3;

        private float currentFps = 0f;
        private float nextFpsUpdate = 0f;
        private float nextUiCheckTime = 0f;
        private float nextServerCheckTime = 0f;
        private int initialCustomizationFrames = 0;

        // Native UI elements
        private bool isLocalServerOnline = true;
        private bool isMenuCustomized = false;

        // GUI Styles & Textures (For in-game F2 overlay)
        private Rect windowRect = new Rect(80, 80, 540, 440);
        private GUIStyle headerStyle;
        private GUIStyle tabStyle;
        private GUIStyle boxStyle;
        private GUIStyle labelStyle;
        private GUIStyle buttonStyle;
        private GUIStyle toggleStyle;
        private Texture2D darkBackground;
        private Texture2D accentBackground;
        private Texture2D whitePixel;

        private static string ConfigPath
        {
            get
            {
                string cfgDir = Path.Combine(UnityEngine.Application.dataPath, "..\\cfg");
                if (!Directory.Exists(cfgDir)) Directory.CreateDirectory(cfgDir);
                return Path.Combine(cfgDir, "rustpilot_tweaks.json");
            }
        }

        private void Awake()
        {
            Instance = this;
            LoadConfig();
        }

        private void Start()
        {
            // Do not perform UI queries during Bootstrap. All UI customization happens when MainMenuSystem or LevelManager is active.
        }

        private void Update()
        {
            if (LoadingScreen.isOpen) return;

            // F2 Toggle Ingame Overlay Menu
            if (UnityEngine.Input.GetKeyDown(KeyCode.F2))
            {
                isVisible = !isVisible;
            }

            // F3 Quick Grass Toggle
            if (UnityEngine.Input.GetKeyDown(KeyCode.F3))
            {
                grassEnabled = !grassEnabled;
                ApplyGrass();
                SaveConfig();
            }

            // Zoom Key (Hold Z)
            if (zoomEnabled)
            {
                if (UnityEngine.Input.GetKeyDown(zoomKey))
                {
                    isZooming = true;
                    originalFov = ConVar.Graphics.fov;
                    ConVar.Graphics.fov = zoomFov;
                }
                else if (UnityEngine.Input.GetKeyUp(zoomKey))
                {
                    if (isZooming)
                    {
                        isZooming = false;
                        ConVar.Graphics.fov = fov;
                    }
                }
            }

            // Periodic server status check
            if (UnityEngine.Time.realtimeSinceStartup > nextServerCheckTime)
            {
                nextServerCheckTime = UnityEngine.Time.realtimeSinceStartup + 5.0f;
                CheckLocalServerStatus();
            }

            // Real-time FPS calculation
            if (UnityEngine.Time.realtimeSinceStartup > nextFpsUpdate)
            {
                currentFps = 1f / Mathf.Max(UnityEngine.Time.smoothDeltaTime, 0.0001f);
                nextFpsUpdate = UnityEngine.Time.realtimeSinceStartup + 0.5f;
            }

            bool isMenuReady = (MainMenuSystem.isOpen || UnityEngine.Object.FindObjectOfType<MainMenuSystem>() != null);
            bool isGameReady = (LocalPlayer.Entity != null || LevelManager.isLoaded);

            if (isMenuReady || isGameReady)
            {
                if (!SteamAuthManager.IsInitialized)
                {
                    SteamAuthManager.Initialize();
                }

                if (!RussianLocalization.IsInitialized)
                {
                    RussianLocalization.Initialize();
                }

                if (isMenuReady)
                {
                    AboutYou ay = UnityEngine.Object.FindObjectOfType<AboutYou>();
                    bool isUncustomized = (ay != null && ay.username != null && (ay.username.text == "Mr Username[DSmiley]" || ay.username.text.Contains("DSmiley")));

                    if (!isMenuCustomized || isUncustomized)
                    {
                        if (ay != null)
                        {
                            isMenuCustomized = true;
                            Cursor.visible = true;
                            Cursor.lockState = CursorLockMode.None;
                            CustomizeMainMenu();
                            RussianLocalization.FilterLanguagePopup();
                        }
                    }
                }

                if (!tabInjected)
                {
                    TryInjectNativeOptionsUI();
                }
            }
        }

        private void CheckLocalServerStatus()
        {
            try
            {
                // Quick socket check on port 28065
                using (Socket sock = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, ProtocolType.Udp))
                {
                    sock.SendTimeout = 500;
                    sock.ReceiveTimeout = 500;
                    sock.Connect("127.0.0.1", 28065);
                    isLocalServerOnline = sock.Connected;
                }
            }
            catch
            {
                isLocalServerOnline = true; // Fallback to true if server is active
            }
        }

        /// <summary>
        /// Native Canvas Customizer for the Main Menu:
        /// 1. Removes Play / ServerBrowser button from Header directly in native Unity UI.
        /// 2. Removes Store and Inventory tabs from Header.
        /// 3. Cleans up the top-right ribbon to display a clean 'СДЕЛАНО TRP' badge with no overlapping text.
        /// 4. Updates player profile (AboutYou) with authentic Steam nickname, SteamID64 and authorization badge.
        /// 5. Injects the scrollable Server List between Profile and Launcher Online in the left column.
        /// 6. Replaces the Friends List with the Launcher Online Players block.
        /// 7. Populates the center NewsSource with rich Devblog 65 Project News.
        /// </summary>
        public void CustomizeMainMenu()
        {
            try
            {
                MainMenuSystem mm = UnityEngine.Object.FindObjectOfType<MainMenuSystem>();
                if (mm == null || !mm.gameObject.activeInHierarchy) return;

                // 1. Fix Top-Right Branding Ribbon (Clean 'СДЕЛАНО TRP' badge with blood red accent)
                Branding[] brandings = mm.GetComponentsInChildren<Branding>(true);
                if (brandings != null)
                {
                    for (int i = 0; i < brandings.Length; i++)
                    {
                        Branding b = brandings[i];
                        if (b == null) continue;

                        if (b.versionText != null)
                        {
                            b.versionText.text = "СДЕЛАНО TRP";
                            b.versionText.color = new Color(1.0f, 0.28f, 0.22f, 1.0f);
                            b.versionText.fontStyle = FontStyle.Bold;
                        }

                        if (b.devBranchExtra != null)
                        {
                            b.devBranchExtra.SetActive(false);
                        }
                    }
                }

                // 2. Scan all Text components in the UI for leftover version strings
                Text[] allTexts = mm.GetComponentsInChildren<Text>(true);
                if (allTexts != null)
                {
                    for (int i = 0; i < allTexts.Length; i++)
                    {
                        Text t = allTexts[i];
                        if (t == null || string.IsNullOrEmpty(t.text)) continue;
                        string val = t.text.Trim();
                        if (val.IndexOf("995.7", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            val.IndexOf("rust alpha", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            val.StartsWith("win.995", StringComparison.OrdinalIgnoreCase) ||
                            val.StartsWith("lin.995", StringComparison.OrdinalIgnoreCase))
                        {
                            t.text = "СДЕЛАНО TRP";
                        }
                    }
                }

                // 3. Update Native Steam Profile card (AboutYou)
                AboutYou[] aboutYous = mm.GetComponentsInChildren<AboutYou>(true);
                if (aboutYous != null)
                {
                    for (int i = 0; i < aboutYous.Length; i++)
                    {
                        AboutYou a = aboutYous[i];
                        if (a == null) continue;

                        if (a.avatar != null)
                        {
                            a.avatar.texture = GetCleanSteamAvatar(SteamAuthManager.CurrentSteamID);
                            a.avatar.color = Color.white;
                        }

                        if (a.username != null)
                        {
                            a.username.text = string.IsNullOrEmpty(SteamAuthManager.CurrentUsername) ? "Игрок" : SteamAuthManager.CurrentUsername;
                            a.username.color = Color.white;
                            a.username.fontStyle = FontStyle.Bold;
                            a.username.fontSize = 15;
                        }

                        if (a.subtitle != null)
                        {
                            string statusStr = SteamAuthManager.IsSteamRunning 
                                ? "<color=#50E36B>● Авторизован в Steam</color>" 
                                : "<color=#FF5555>● Steam не запущен</color>";
                            a.subtitle.text = string.Format("SteamID: {0}\n{1}", SteamAuthManager.CurrentSteamID, statusStr);
                            a.subtitle.color = new Color(0.85f, 0.90f, 0.95f, 1f);
                            a.subtitle.lineSpacing = 1.15f;
                            a.subtitle.fontSize = 11;
                        }
                        a.enabled = false;
                    }
                }

                // 4. Hide obsolete Facepunch Panels (Infographics, GameStat)
                LifeInfographic[] infographics = mm.GetComponentsInChildren<LifeInfographic>(true);
                if (infographics != null)
                {
                    for (int i = 0; i < infographics.Length; i++)
                    {
                        if (infographics[i] != null && infographics[i].gameObject != null)
                        {
                            infographics[i].enabled = false;
                            infographics[i].gameObject.SetActive(false);
                            if (infographics[i].transform.parent != null && infographics[i].transform.parent.name.Contains("Info"))
                            {
                                infographics[i].transform.parent.gameObject.SetActive(false);
                            }
                        }
                    }
                }

                GameStat[] stats = mm.GetComponentsInChildren<GameStat>(true);
                if (stats != null)
                {
                    for (int i = 0; i < stats.Length; i++)
                    {
                        if (stats[i] != null && stats[i].gameObject != null)
                        {
                            stats[i].enabled = false;
                            stats[i].gameObject.SetActive(false);
                            if (stats[i].transform.parent != null && stats[i].transform.parent.name.Contains("Stat"))
                            {
                                stats[i].transform.parent.gameObject.SetActive(false);
                            }
                        }
                    }
                }

                // 5. Hide Social Containers (r/playrust, @playrust, facepunchrust)
                Transform[] allTransforms = mm.GetComponentsInChildren<Transform>(true);
                if (allTransforms != null)
                {
                    for (int i = 0; i < allTransforms.Length; i++)
                    {
                        Transform tr = allTransforms[i];
                        if (tr == null || tr.gameObject == null) continue;
                        string trName = tr.name.ToLowerInvariant();
                        if (trName.Contains("social") || trName.Contains("reddit") || trName.Contains("twitter") || trName.Contains("facebook"))
                        {
                            tr.gameObject.SetActive(false);
                        }
                    }
                }

                // 6. Fix Language selection flag to Russian
                LanguageSelection ls = mm.GetComponentInChildren<LanguageSelection>(true);
                if (ls != null && ls.flagImage != null)
                {
                    Sprite ruFlag = FileSystem.Load<Sprite>("Assets/Icons/flags/ru.png", true);
                    if (ruFlag != null) ls.flagImage.sprite = ruFlag;
                }

                // 7. Clean Main Menu Navigation Selectables
                Selectable[] selectables = mm.GetComponentsInChildren<Selectable>(true);
                if (selectables != null)
                {
                    for (int i = 0; i < selectables.Length; i++)
                    {
                        Selectable s = selectables[i];
                        if (s == null) continue;

                        if (LocalPlayer.Entity != null && s.GetComponentInParent<UIInventory>() != null) continue;

                        // Comprehensive guard: Never touch ANY element inside Options, Settings, Categories, or TweakUI
                        if (s.GetComponentInParent<TweakUI>() != null || s.GetComponent<TweakUI>() != null ||
                            s.GetComponentInParent<TweakUISlider>() != null || s.GetComponentInParent<TweakUIToggle>() != null ||
                            s.GetComponentInParent<ToggleGroup>() != null || s.GetComponentInParent<ScrollRect>() != null ||
                            s.name.StartsWith("Tab_") || s.name.StartsWith("Row_") || s.name.StartsWith("Header_"))
                        {
                            continue;
                        }

                        Transform curP = s.transform;
                        bool isInsideOptions = false;
                        while (curP != null)
                        {
                            string pn = curP.name.ToLowerInvariant();
                            if (pn.Contains("option") || pn.Contains("setting") || pn.Contains("tweak") || pn.Contains("category") || pn.Contains("categories"))
                            {
                                isInsideOptions = true;
                                break;
                            }
                            curP = curP.parent;
                        }
                        if (isInsideOptions) continue;

                        string sName = s.gameObject.name.ToLowerInvariant();
                        string pName = s.transform.parent != null ? s.transform.parent.name.ToLowerInvariant() : "";

                        Image img = s.GetComponent<Image>() ?? s.GetComponentInChildren<Image>(true);
                        string spriteName = (img != null && img.sprite != null) ? img.sprite.name.ToLowerInvariant() : "";

                        Text txt = s.GetComponentInChildren<Text>(true);
                        string tVal = (txt != null && txt.text != null) ? txt.text.Trim().ToLowerInvariant() : "";

                        // Header Play / ServerBrowser button removal in main menu only
                        bool isPlayHeaderButton = 
                            (sName == "play" || sName == "servers" || sName.Contains("serverbrowser") || spriteName.Contains("server") || spriteName.Contains("play")) &&
                            (pName.Contains("header") || pName.Contains("top") || pName.Contains("bar") || pName.Contains("navigation") || pName.Contains("menu"));

                        if (isPlayHeaderButton)
                        {
                            s.gameObject.SetActive(false);
                        }

                        // Store / Inventory button removal
                        bool isInventoryOrStore = 
                            sName.Contains("store") || sName.Contains("inventory") || sName.Contains("shop") || sName.Contains("cart") || sName.Contains("shirt") ||
                            pName.Contains("store") || pName.Contains("inventory") || pName.Contains("shop") ||
                            spriteName.Contains("store") || spriteName.Contains("inventory") || spriteName.Contains("shop") || spriteName.Contains("cart") || spriteName.Contains("shirt") || spriteName.Contains("cloth") ||
                            tVal == "store" || tVal == "inventory" || tVal == "магазин" || tVal == "инвентарь" || tVal.Contains("item store") || tVal.Contains("steam inventory");

                        if (isInventoryOrStore)
                        {
                            s.gameObject.SetActive(false);
                            if (s.transform.parent != null && (pName.Contains("tab") || pName.Contains("item") || pName.Contains("btn") || pName.Contains("inventory") || pName.Contains("store")))
                            {
                                s.transform.parent.gameObject.SetActive(false);
                            }
                        }

                        // Social buttons removal (playrust, facebook, twitter)
                        bool isSocial = sName.Contains("social") || sName.Contains("twitter") || sName.Contains("reddit") || sName.Contains("facebook") ||
                            tVal.Contains("playrust") || tVal.Contains("facepunch") || spriteName.Contains("reddit") || spriteName.Contains("twitter");

                        if (isSocial)
                        {
                            s.gameObject.SetActive(false);
                            if (s.transform.parent != null) s.transform.parent.gameObject.SetActive(false);
                        }
                    }
                }

                // 6. Populate Native Devblog 65 Project News in NewsSource
                PopulateDevblog65News(mm);

                // 7. Inject Left Column Panels (Server List between Profile & Launcher Online, and Launcher Online at bottom)
                EnsureLeftColumnPanels(mm);
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] CustomizeMainMenu error: " + ex);
            }
        }

        private static Texture2D defaultAvatarTex = null;

        /// <summary>
        /// Retrieves the authentic Steam avatar or creates a clean stylized avatar without red color distortion.
        /// </summary>
        public static Texture GetCleanSteamAvatar(ulong steamid)
        {
            try
            {
                if (SingletonComponent<SteamClient>.Instance != null)
                {
                    Texture stTex = SingletonComponent<SteamClient>.Instance.GetAvatarTexture(steamid);
                    if (stTex != null)
                    {
                        return stTex;
                    }
                }
            }
            catch { }

            if (defaultAvatarTex == null)
            {
                defaultAvatarTex = new Texture2D(64, 64, TextureFormat.RGBA32, false);
                Color32 bg = new Color32(35, 40, 45, 255);
                Color32 border = new Color32(70, 80, 90, 255);
                Color32 head = new Color32(180, 190, 200, 255);

                for (int x = 0; x < 64; x++)
                {
                    for (int y = 0; y < 64; y++)
                    {
                        if (x == 0 || x == 63 || y == 0 || y == 63)
                        {
                            defaultAvatarTex.SetPixel(x, y, border);
                        }
                        else
                        {
                            float dx = x - 32f;
                            float dy = y - 40f;
                            bool isHead = (dx * dx + dy * dy) <= 11f * 11f;
                            float dy2 = y - 14f;
                            bool isBody = (dx * dx * 0.5f + dy2 * dy2) <= 17f * 17f && y <= 24;

                            if (isHead || isBody)
                            {
                                defaultAvatarTex.SetPixel(x, y, head);
                            }
                            else
                            {
                                defaultAvatarTex.SetPixel(x, y, bg);
                            }
                        }
                    }
                }
                defaultAvatarTex.Apply();
            }
            return defaultAvatarTex;
        }

        /// <summary>
        /// Populates the central NewsSource component with clean typography, proper layout, and zero text collisions.
        /// </summary>
        private void PopulateDevblog65News(MainMenuSystem mm)
        {
            try
            {
                // 1. Hide obsolete NewsButtons in bottom right (and their parent container if empty)
                NewsButton[] newsButtons = mm.GetComponentsInChildren<NewsButton>(true);
                if (newsButtons != null)
                {
                    for (int i = 0; i < newsButtons.Length; i++)
                    {
                        if (newsButtons[i] != null && newsButtons[i].gameObject != null)
                        {
                            newsButtons[i].gameObject.SetActive(false);
                            if (newsButtons[i].transform.parent != null && newsButtons[i].transform.parent.name.Contains("News"))
                            {
                                Image pImg = newsButtons[i].transform.parent.GetComponent<Image>();
                                if (pImg != null) pImg.enabled = false;
                            }
                        }
                    }
                }

                // 2. Format NewsSource
                NewsSource[] newsSources = mm.GetComponentsInChildren<NewsSource>(true);
                if (newsSources == null || newsSources.Length == 0) return;

                for (int i = 0; i < newsSources.Length; i++)
                {
                    NewsSource ns = newsSources[i];
                    if (ns == null || !ns.gameObject.activeInHierarchy) continue;

                    ns.StopAllCoroutines();

                    if (ns.title != null)
                    {
                        ns.title.text = "НОВОСТИ ПРОЕКТА RUST DEVBLOG 65";
                        ns.title.color = Color.white;
                        ns.title.fontStyle = FontStyle.Bold;
                        ns.title.fontSize = 22;
                    }

                    if (ns.authorName != null)
                    {
                        ns.authorName.text = "posted by TEAM_RUST_PLUGINS";
                        ns.authorName.color = new Color(0.75f, 0.75f, 0.75f, 0.8f);
                    }

                    // Disable the date label to prevent text overlap collisions
                    if (ns.date != null && ns.date.gameObject != null)
                    {
                        ns.date.gameObject.SetActive(false);
                    }

                    if (ns.button != null && ns.button.gameObject != null)
                    {
                        ns.button.gameObject.SetActive(false);
                    }

                    if (ns.image != null)
                    {
                        ns.image.enabled = false;
                    }

                    if (ns.text != null)
                    {
                        ns.text.text = 
                            "Добро пожаловать на официальный клиент Rust Devblog 65 от команды TEAM_RUST_PLUGINS!\n\n" +
                            "• Классический геймплей: аутентичная физика оружия, процедурная генерация карты и баланс 65 девблога.\n" +
                            "• Полная русская локализация: интерфейс, меню настроек, крафт и радиальные меню полностью переведены на русский язык.\n" +
                            "• Авторизация через Steam: надежная привязка по SteamID64 и мгновенный доступ на серверы.\n" +
                            "• Графические твики и FPS Boost:\n" +
                            "  — Меню настроек твиков на клавишу F2 (вкладка 'ДОПОЛНИТЕЛЬНО');\n" +
                            "  — Быстрое включение/отключение травы на клавишу F3;\n" +
                            "  — Оптический зум на зажатие клавиши Z;\n" +
                            "  — Настраиваемый угол обзора (FOV) и оптимизация теней.\n" +
                            "• Быстрое подключение: выберите сервер в списке слева для мгновенного входа в игру.\n\n" +
                            "Желаем приятной игры и отличного выживания!";
                        ns.text.color = new Color(0.92f, 0.92f, 0.92f, 1f);
                        ns.text.lineSpacing = 1.15f;
                    }

                    // Single story setup to prevent Facepunch RSS pagination override
                    NewsSource.Story singleStory = new NewsSource.Story
                    {
                        name = "НОВОСТИ ПРОЕКТА RUST DEVBLOG 65",
                        author = "TEAM_RUST_PLUGINS",
                        date = 0,
                        text = ns.text != null ? ns.text.text : ""
                    };
                    ns.story = new NewsSource.Story[] { singleStory };

                    // Hide extra pagination dots
                    Toggle[] allToggles = ns.GetComponentsInChildren<Toggle>(true);
                    if (allToggles != null && allToggles.Length > 1)
                    {
                        for (int t = 1; t < allToggles.Length; t++)
                        {
                            if (allToggles[t] != null && allToggles[t].gameObject != null)
                            {
                                allToggles[t].gameObject.SetActive(false);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] PopulateDevblog65News error: " + ex);
            }
        }

        /// <summary>
        /// Ensures left column panels with perfect proportions and Russian localization:
        /// 1. AboutYou (Profile) at the top.
        /// 2. ServerHistory (Список серверов) in the middle.
        /// 3. YourFriends (Онлайн в лаунчере) at the bottom.
        /// </summary>
        private void EnsureLeftColumnPanels(MainMenuSystem mm)
        {
            try
            {
                // 1. Locate AboutYou (Top Panel)
                AboutYou[] aboutYous = mm.GetComponentsInChildren<AboutYou>(true);
                AboutYou ay = (aboutYous != null && aboutYous.Length > 0) ? aboutYous[0] : null;
                if (ay == null || ay.gameObject == null) return;

                Transform leftContainer = ay.transform.parent;
                if (leftContainer == null) return;

                // Sibling 0: AboutYou
                ay.gameObject.SetActive(true);
                ay.transform.SetSiblingIndex(0);

                // 2. Hide / Clear LifeInfographics to prevent unwanted clutter
                LifeInfographic[] infographics = mm.GetComponentsInChildren<LifeInfographic>(true);
                if (infographics != null)
                {
                    for (int i = 0; i < infographics.Length; i++)
                    {
                        if (infographics[i] != null && infographics[i].gameObject != null)
                        {
                            infographics[i].gameObject.SetActive(false);
                        }
                    }
                }

                // 3. Sibling 1: Native ServerHistory (Middle Panel)
                ServerHistory[] shList = mm.GetComponentsInChildren<ServerHistory>(true);
                if (shList != null && shList.Length > 0)
                {
                    ServerHistory sh = shList[0];
                    if (sh != null && sh.gameObject != null)
                    {
                        sh.gameObject.SetActive(true);
                        sh.transform.SetSiblingIndex(1);
                        sh.enabled = false; // Disable SteamMatchmaking queries

                        // Update Header Text & Destroy LocalizeText
                        Text[] shTexts = sh.gameObject.GetComponentsInChildren<Text>(true);
                        for (int i = 0; i < shTexts.Length; i++)
                        {
                            if (shTexts[i] == null) continue;
                            string t = shTexts[i].text.Trim().ToUpperInvariant();
                            if (t.Contains("SERVER") || t.Contains("HISTORY") || t.Contains("СЕРВЕР") || t.Contains("ИСТОРИЯ"))
                            {
                                LocalizeText loc = shTexts[i].GetComponent<LocalizeText>();
                                if (loc != null) UnityEngine.Object.Destroy(loc);
                                shTexts[i].text = "СПИСОК СЕРВЕРОВ";
                                shTexts[i].fontStyle = FontStyle.Bold;
                            }
                        }

                        // Populate panelList with 2 balanced server items
                        if (sh.panelList != null)
                        {
                            Transform plTr = sh.panelList.transform;
                            for (int i = plTr.childCount - 1; i >= 0; i--)
                            {
                                Transform ch = plTr.GetChild(i);
                                if (ch != null)
                                {
                                    UnityEngine.Object.Destroy(ch.gameObject);
                                }
                            }

                            if (sh.prefab != null)
                            {
                                // Server 1: Procedural Map
                                GameObject sItem1 = UnityEngine.Object.Instantiate<GameObject>(sh.prefab.gameObject);
                                sItem1.name = "TRP_ServerEntry_1";
                                sItem1.transform.SetParent(plTr, false);

                                ServerHistoryItem shi1 = sItem1.GetComponent<ServerHistoryItem>();
                                if (shi1 != null)
                                {
                                    if (shi1.serverName != null)
                                    {
                                        shi1.serverName.text = "DEVBLOG 65 OFFICIAL [PROCEDURAL]";
                                        shi1.serverName.fontStyle = FontStyle.Bold;
                                    }
                                    if (shi1.players != null) shi1.players.text = "<color=#50E36B>0/100</color>";
                                    if (shi1.lastJoinDate != null) shi1.lastJoinDate.text = "<color=#50E36B>● ОНЛАЙН</color> • ПОРТ 28065 • ПРЯМОЕ ПОДКЛЮЧЕНИЕ";
                                    shi1.enabled = false;
                                }

                                Button btn1 = sItem1.GetComponent<Button>() ?? sItem1.AddComponent<Button>();
                                btn1.onClick.RemoveAllListeners();
                                btn1.onClick.AddListener(new UnityAction(delegate()
                                {
                                    ConsoleSystem.Run.Client.Normal("connect 127.0.0.1:28065");
                                }));

                                // Server 2: Barren Map
                                GameObject sItem2 = UnityEngine.Object.Instantiate<GameObject>(sh.prefab.gameObject);
                                sItem2.name = "TRP_ServerEntry_2";
                                sItem2.transform.SetParent(plTr, false);

                                ServerHistoryItem shi2 = sItem2.GetComponent<ServerHistoryItem>();
                                if (shi2 != null)
                                {
                                    if (shi2.serverName != null)
                                    {
                                        shi2.serverName.text = "DEVBLOG 65 BARREN [MAX FPS / PVP]";
                                        shi2.serverName.fontStyle = FontStyle.Bold;
                                    }
                                    if (shi2.players != null) shi2.players.text = "<color=#888888>0/50</color>";
                                    if (shi2.lastJoinDate != null) shi2.lastJoinDate.text = "<color=#888888>○ ОФФЛАЙН</color> • ПОРТ 28066 • КАРТА ДЛЯ СЛАБЫХ ПК";
                                    shi2.enabled = false;
                                }

                                Button btn2 = sItem2.GetComponent<Button>() ?? sItem2.AddComponent<Button>();
                                btn2.onClick.RemoveAllListeners();
                                btn2.onClick.AddListener(new UnityAction(delegate()
                                {
                                    ConsoleSystem.Run.Client.Normal("connect 127.0.0.1:28066");
                                }));
                            }
                        }
                    }
                }

                // 4. Sibling 2: Native YourFriends (Bottom Panel - Онлайн в лаунчере)
                YourFriends[] yfList = mm.GetComponentsInChildren<YourFriends>(true);
                if (yfList != null && yfList.Length > 0)
                {
                    YourFriends yf = yfList[0];
                    if (yf != null && yf.gameObject != null)
                    {
                        yf.gameObject.SetActive(true);
                        yf.transform.SetSiblingIndex(2);
                        yf.enabled = false;

                        // Update Header to "ОНЛАЙН В ЛАУНЧЕРЕ" & Destroy LocalizeText
                        Text[] yfTexts = yf.gameObject.GetComponentsInChildren<Text>(true);
                        for (int i = 0; i < yfTexts.Length; i++)
                        {
                            if (yfTexts[i] == null) continue;
                            string t = yfTexts[i].text.Trim().ToUpperInvariant();
                            if (t.Contains("FRIEND") || t.Contains("ДРУЗЬЯ") || t.Contains("СПИСОК") || t.Contains("YOUR"))
                            {
                                LocalizeText loc = yfTexts[i].GetComponent<LocalizeText>();
                                if (loc != null) UnityEngine.Object.Destroy(loc);
                                yfTexts[i].text = "ОНЛАЙН В ЛАУНЧЕРЕ";
                                yfTexts[i].fontStyle = FontStyle.Bold;
                            }
                        }

                        // Populate player card
                        if (yf.PanelList != null)
                        {
                            for (int i = yf.PanelList.childCount - 1; i >= 0; i--)
                            {
                                Transform ch = yf.PanelList.GetChild(i);
                                if (ch != null)
                                {
                                    UnityEngine.Object.Destroy(ch.gameObject);
                                }
                            }

                            if (yf.FriendsPrefab != null)
                            {
                                GameObject fItem = UnityEngine.Object.Instantiate<GameObject>(yf.FriendsPrefab.gameObject);
                                fItem.name = "TRP_PlayerCard";
                                fItem.transform.SetParent(yf.PanelList, false);

                                MenuFriendPanel mfp = fItem.GetComponent<MenuFriendPanel>();
                                if (mfp != null)
                                {
                                    if (mfp.friendName != null)
                                    {
                                        mfp.friendName.text = string.IsNullOrEmpty(SteamAuthManager.CurrentUsername) ? "Игрок" : SteamAuthManager.CurrentUsername;
                                        mfp.friendName.color = Color.white;
                                        mfp.friendName.fontStyle = FontStyle.Bold;
                                        mfp.friendName.fontSize = 14;
                                    }
                                    if (mfp.friendSubtitle != null)
                                    {
                                        mfp.friendSubtitle.text = "<color=#50E36B>●</color> В главном меню (Онлайн)";
                                        mfp.friendSubtitle.color = new Color(0.85f, 0.90f, 0.95f, 1.0f);
                                    }
                                    if (mfp.friendAvatar != null)
                                    {
                                        mfp.friendAvatar.texture = GetCleanSteamAvatar(SteamAuthManager.CurrentSteamID);
                                        mfp.friendAvatar.color = Color.white;
                                    }
                                    mfp.enabled = false;
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] EnsureLeftColumnPanels error: " + ex);
            }
        }

        #region Dedicated Settings Tab & Page Injection

        private GameObject tweaksPageGo = null;
        private Toggle tweaksTabToggle = null;
        private Transform nativeTabContainer = null;
        private Transform nativePagesParent = null;
        private GameObject templateSliderRow = null;
        private GameObject templateToggleRow = null;
        private GameObject templateSectionHeader = null;
        private bool tabInjected = false;

        public void TryInjectNativeOptionsUI()
        {
            try
            {
                if (tabInjected && tweaksTabToggle != null && tweaksPageGo != null) return;

                // 1. Locate an existing native page in the scene (e.g. Graphics or Performance)
                TweakUISlider sampleSlider = UnityEngine.Object.FindObjectOfType<TweakUISlider>();
                if (sampleSlider == null) return;

                ScrollRect nativeScrollRect = sampleSlider.GetComponentInParent<ScrollRect>();
                if (nativeScrollRect == null) return;

                GameObject nativeTemplatePage = nativeScrollRect.gameObject;
                nativePagesParent = nativeTemplatePage.transform.parent;

                // 2. Locate the Categories Tab Container (holding Graphics, Performance, Audio, Input, Gameplay)
                Toggle[] allToggles = UnityEngine.Object.FindObjectsOfType<Toggle>();
                Toggle categorySample = null;
                if (allToggles != null)
                {
                    for (int i = 0; i < allToggles.Length; i++)
                    {
                        Toggle tog = allToggles[i];
                        if (tog == null || tog.transform == null || tog.transform.parent == null) continue;
                        string gName = tog.gameObject.name.ToUpperInvariant();
                        Text txt = tog.GetComponentInChildren<Text>(true);
                        string tVal = txt != null && txt.text != null ? txt.text.Trim().ToUpperInvariant() : "";

                        if (gName.Contains("PERFORMANCE") || gName.Contains("GRAPHICS") || tVal.Contains("PERFORMANCE") || tVal.Contains("GRAPHICS") || tVal.Contains("ГРАФИКА"))
                        {
                            if (tog.group != null || tog.transform.parent.GetComponent<ToggleGroup>() != null || tog.transform.parent.GetComponent<ToggleGroupCookie>() != null || tog.transform.parent.name == "Categories" || tog.transform.parent.childCount >= 3)
                            {
                                categorySample = tog;
                                break;
                            }
                        }
                    }
                }

                if (categorySample == null) return;
                nativeTabContainer = categorySample.transform.parent;

                // 3. Extract native row templates from the native page BEFORE creating our page
                TweakUISlider nativeSlider = nativeTemplatePage.GetComponentInChildren<TweakUISlider>(true);
                if (nativeSlider != null)
                {
                    templateSliderRow = nativeSlider.gameObject;
                }

                TweakUIToggle nativeToggle = nativeTemplatePage.GetComponentInChildren<TweakUIToggle>(true);
                if (nativeToggle != null)
                {
                    templateToggleRow = nativeToggle.gameObject;
                }

                Text[] allPageTexts = nativeTemplatePage.GetComponentsInChildren<Text>(true);
                if (allPageTexts != null)
                {
                    for (int i = 0; i < allPageTexts.Length; i++)
                    {
                        Text t = allPageTexts[i];
                        if (t != null && t.GetComponentInParent<TweakUISlider>() == null && t.GetComponentInParent<TweakUIToggle>() == null && t.GetComponentInParent<Slider>() == null && t.GetComponentInParent<Toggle>() == null)
                        {
                            templateSectionHeader = t.gameObject;
                            break;
                        }
                    }
                }

                // 4. Inject our category tab "ДОПОЛНИТЕЛЬНО" into native ToggleGroup
                if (tweaksTabToggle == null)
                {
                    GameObject newTabGo = UnityEngine.Object.Instantiate<GameObject>(categorySample.gameObject);
                    newTabGo.name = "Tab_TRP_Extra";
                    newTabGo.transform.SetParent(nativeTabContainer, false);

                    foreach (var lt in newTabGo.GetComponentsInChildren<LocalizeText>(true))
                    {
                        UnityEngine.Object.DestroyImmediate(lt);
                    }

                    Text tabTxt = newTabGo.GetComponentInChildren<Text>(true);
                    if (tabTxt != null)
                    {
                        tabTxt.text = "ДОПОЛНИТЕЛЬНО";
                        tabTxt.fontStyle = FontStyle.Bold;
                    }

                    Toggle oldTog = newTabGo.GetComponent<Toggle>();
                    ToggleGroup group = oldTog != null ? oldTog.group : categorySample.group;
                    SpriteState ss = oldTog != null ? oldTog.spriteState : categorySample.spriteState;
                    ColorBlock cb = oldTog != null ? oldTog.colors : categorySample.colors;
                    Graphic tg = oldTog != null ? oldTog.targetGraphic : categorySample.targetGraphic;
                    Graphic gr = oldTog != null ? oldTog.graphic : categorySample.graphic;
                    if (oldTog != null) UnityEngine.Object.DestroyImmediate(oldTog);

                    tweaksTabToggle = newTabGo.AddComponent<Toggle>();
                    tweaksTabToggle.group = group;
                    tweaksTabToggle.spriteState = ss;
                    tweaksTabToggle.colors = cb;
                    tweaksTabToggle.targetGraphic = tg;
                    tweaksTabToggle.graphic = gr;
                    tweaksTabToggle.isOn = false;
                    tweaksTabToggle.onValueChanged.AddListener(new UnityAction<bool>(delegate(bool isOn)
                    {
                        if (tweaksPageGo != null)
                        {
                            tweaksPageGo.SetActive(isOn);
                        }
                    }));
                }

                // 5. Clone native page for 100% authentic styling, scrollbar, mask, and padding
                if (tweaksPageGo == null)
                {
                    tweaksPageGo = UnityEngine.Object.Instantiate<GameObject>(nativeTemplatePage);
                    tweaksPageGo.name = "Page_TRP_Extra";
                    tweaksPageGo.transform.SetParent(nativePagesParent, false);

                    RectTransform myRt = tweaksPageGo.GetComponent<RectTransform>();
                    RectTransform tmplRt = nativeTemplatePage.GetComponent<RectTransform>();
                    if (myRt != null && tmplRt != null)
                    {
                        myRt.anchorMin = tmplRt.anchorMin;
                        myRt.anchorMax = tmplRt.anchorMax;
                        myRt.anchoredPosition = tmplRt.anchoredPosition;
                        myRt.sizeDelta = tmplRt.sizeDelta;
                        myRt.pivot = tmplRt.pivot;
                    }

                    ScrollRect scroll = tweaksPageGo.GetComponent<ScrollRect>();
                    Transform content = scroll != null && scroll.content != null ? scroll.content : tweaksPageGo.transform.Find("Viewport/Content") ?? tweaksPageGo.transform;

                    // Remove existing game items in our cloned content container
                    for (int i = content.childCount - 1; i >= 0; i--)
                    {
                        UnityEngine.Object.DestroyImmediate(content.GetChild(i).gameObject);
                    }

                    // Populate with our mod settings
                    PopulateTweaksPage(content);
                    tweaksPageGo.SetActive(false);
                }

                tabInjected = true;
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] TryInjectNativeOptionsUI error: " + ex);
            }
        }

        private void PopulateTweaksPage(Transform content)
        {
            CreateNativeSectionHeader(content, "ОКРУЖЕНИЕ И РАСТИТЕЛЬНОСТЬ");
            CreateNativeToggleRow(content, "Отображение травы (F3)", grassEnabled, delegate(bool val) { grassEnabled = val; ApplyGrass(); SaveConfig(); });
            CreateNativeSliderRow(content, "Качество прорисовки травы", grassQuality, 0f, 100f, "{0:0}", delegate(float val) { grassQuality = val; ApplyGrass(); SaveConfig(); });
            CreateNativeToggleRow(content, "Приминание травы игроками", grassDisplacement, delegate(bool val) { grassDisplacement = val; ApplyGrass(); SaveConfig(); });
            CreateNativeSliderRow(content, "Качество декораций", decorQuality, 0f, 100f, "{0:0}", delegate(float val) { decorQuality = val; ApplyGrass(); SaveConfig(); });
            CreateNativeSliderRow(content, "Качество деревьев", treeQuality, 0f, 100f, "{0:0}", delegate(float val) { treeQuality = val; ApplyGrass(); SaveConfig(); });

            CreateNativeSectionHeader(content, "КАМЕРА И ПОЛЕ ЗРЕНИЯ");
            CreateNativeSliderRow(content, "Угол обзора (FOV)", fov, 65f, 110f, "{0:0}", delegate(float val) { fov = val; ApplyCamera(); SaveConfig(); });
            CreateNativeToggleRow(content, "Оптический зум (Клавиша Z)", zoomEnabled, delegate(bool val) { zoomEnabled = val; SaveConfig(); });
            CreateNativeSliderRow(content, "Кратность зума FOV", zoomFov, 15f, 50f, "{0:0}", delegate(float val) { zoomFov = val; SaveConfig(); });
            CreateNativeToggleRow(content, "Глубина резкости (DOF)", dofEnabled, delegate(bool val) { dofEnabled = val; ApplyCamera(); SaveConfig(); });

            CreateNativeSectionHeader(content, "ПРОИЗВОДИТЕЛЬНОСТЬ И ТЕНИ");
            CreateNativeToggleRow(content, "Динамические тени", shadowsEnabled, delegate(bool val) { shadowsEnabled = val; ApplyShadows(); SaveConfig(); });
            CreateNativeSliderRow(content, "Дальность прорисовки теней", shadowDistance, 0f, 200f, "{0:0}", delegate(float val) { shadowDistance = val; ApplyShadows(); SaveConfig(); });
            CreateNativeToggleRow(content, "Отражения на воде", waterReflections, delegate(bool val) { waterReflections = val; ApplyPerformance(); SaveConfig(); });
            CreateNativeSliderRow(content, "Лимит частоты кадров (Max FPS)", fpsLimit, 30f, 300f, "{0:0}", delegate(float val) { fpsLimit = (int)val; ApplyPerformance(); SaveConfig(); });
            CreateNativeToggleRow(content, "Полноэкранный оверлей FPS", showFpsOverlay, delegate(bool val) { showFpsOverlay = val; SaveConfig(); });
            CreateNativeToggleRow(content, "Повышенная яркость (FullBright)", fullBright, delegate(bool val) { fullBright = val; ApplyFullBright(); SaveConfig(); });

            CreateNativeSectionHeader(content, "КАСТОМНЫЙ ПРИЦЕЛ");
            CreateNativeToggleRow(content, "Включить прицел по центру экрана", crosshairEnabled, delegate(bool val) { crosshairEnabled = val; SaveConfig(); });
            CreateNativeSliderRow(content, "Размер перекрестия", crosshairSize, 2f, 12f, "{0:0}", delegate(float val) { crosshairSize = (int)val; SaveConfig(); });
            CreateNativeSliderRow(content, "Зазор перекрестия", crosshairGap, 1f, 10f, "{0:0}", delegate(float val) { crosshairGap = (int)val; SaveConfig(); });
        }

        private void CreateNativeSectionHeader(Transform parent, string title)
        {
            if (templateSectionHeader != null)
            {
                try
                {
                    GameObject headerGo = UnityEngine.Object.Instantiate<GameObject>(templateSectionHeader);
                    headerGo.name = "Header_" + title;
                    headerGo.transform.SetParent(parent, false);
                    headerGo.SetActive(true);

                    foreach (var lt in headerGo.GetComponentsInChildren<LocalizeText>(true))
                    {
                        UnityEngine.Object.DestroyImmediate(lt);
                    }

                    Text headerTxt = headerGo.GetComponentInChildren<Text>(true);
                    if (headerTxt != null)
                    {
                        headerTxt.text = title.ToUpperInvariant();
                    }
                    return;
                }
                catch (Exception ex)
                {
                    Debug.LogWarning("[RustPilot] CreateNativeSectionHeader clone error: " + ex);
                }
            }

            CreateFallbackSectionHeader(parent, title);
        }

        private void CreateFallbackSectionHeader(Transform parent, string title)
        {
            try
            {
                GameObject headerGo = new GameObject("Header_" + title);
                headerGo.transform.SetParent(parent, false);

                RectTransform rt = headerGo.AddComponent<RectTransform>();
                rt.sizeDelta = new Vector2(0, 44);

                Text txt = headerGo.AddComponent<Text>();
                txt.text = title.ToUpperInvariant();
                txt.font = GetNativeFont();
                txt.fontSize = 20;
                txt.fontStyle = FontStyle.Bold;
                txt.color = new Color(0.42f, 0.45f, 0.38f, 1.0f);
                txt.alignment = TextAnchor.MiddleLeft;

                LayoutElement le = headerGo.AddComponent<LayoutElement>();
                le.minHeight = 44;
                le.preferredHeight = 44;
                le.flexibleWidth = 1f;
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] CreateFallbackSectionHeader error: " + ex);
            }
        }

        private void CreateNativeToggleRow(Transform parent, string labelText, bool initialValue, Action<bool> onToggle)
        {
            if (templateToggleRow != null)
            {
                try
                {
                    GameObject rowGo = UnityEngine.Object.Instantiate<GameObject>(templateToggleRow);
                    rowGo.name = "Row_" + labelText;
                    rowGo.transform.SetParent(parent, false);
                    rowGo.SetActive(true);

                    foreach (var lt in rowGo.GetComponentsInChildren<LocalizeText>(true))
                    {
                        UnityEngine.Object.DestroyImmediate(lt);
                    }

                    TweakUIToggle oldTweak = rowGo.GetComponent<TweakUIToggle>();
                    Toggle toggle = oldTweak != null ? oldTweak.toggleControl : rowGo.GetComponentInChildren<Toggle>(true);
                    if (oldTweak != null) UnityEngine.Object.DestroyImmediate(oldTweak);

                    Text labelTxt = rowGo.GetComponentInChildren<Text>(true);
                    if (labelTxt != null)
                    {
                        labelTxt.text = labelText.ToUpperInvariant();
                        labelTxt.horizontalOverflow = HorizontalWrapMode.Overflow;
                        labelTxt.verticalOverflow = VerticalWrapMode.Truncate;
                        RectTransform lRt = labelTxt.GetComponent<RectTransform>();
                        if (lRt != null)
                        {
                            lRt.sizeDelta = new Vector2(380, lRt.sizeDelta.y);
                        }
                    }

                    if (toggle != null)
                    {
                        toggle.onValueChanged.RemoveAllListeners();
                        toggle.isOn = initialValue;
                        toggle.onValueChanged.AddListener(new UnityAction<bool>(delegate(bool val)
                        {
                            onToggle(val);
                        }));
                    }
                    return;
                }
                catch (Exception ex)
                {
                    Debug.LogWarning("[RustPilot] CreateNativeToggleRow clone error: " + ex);
                }
            }

            CreateFallbackToggleRow(parent, labelText, initialValue, onToggle);
        }

        private void CreateNativeSliderRow(Transform parent, string labelText, float initialValue, float min, float max, string format, Action<float> onSlide)
        {
            if (templateSliderRow != null)
            {
                try
                {
                    GameObject rowGo = UnityEngine.Object.Instantiate<GameObject>(templateSliderRow);
                    rowGo.name = "Row_" + labelText;
                    rowGo.transform.SetParent(parent, false);
                    rowGo.SetActive(true);

                    foreach (var lt in rowGo.GetComponentsInChildren<LocalizeText>(true))
                    {
                        UnityEngine.Object.DestroyImmediate(lt);
                    }

                    TweakUISlider oldTweak = rowGo.GetComponent<TweakUISlider>();
                    Slider slider = oldTweak != null ? oldTweak.sliderControl : rowGo.GetComponentInChildren<Slider>(true);
                    Text valTxt = oldTweak != null ? oldTweak.textControl : null;
                    if (oldTweak != null) UnityEngine.Object.DestroyImmediate(oldTweak);

                    Text labelTxt = null;
                    Text[] allTexts = rowGo.GetComponentsInChildren<Text>(true);
                    for (int i = 0; i < allTexts.Length; i++)
                    {
                        if (allTexts[i] != valTxt)
                        {
                            labelTxt = allTexts[i];
                            break;
                        }
                    }

                    if (labelTxt != null)
                    {
                        labelTxt.text = labelText.ToUpperInvariant();
                        labelTxt.horizontalOverflow = HorizontalWrapMode.Overflow;
                        labelTxt.verticalOverflow = VerticalWrapMode.Truncate;
                        RectTransform lRt = labelTxt.GetComponent<RectTransform>();
                        if (lRt != null)
                        {
                            lRt.sizeDelta = new Vector2(380, lRt.sizeDelta.y);
                        }
                    }

                    if (slider != null)
                    {
                        slider.minValue = min;
                        slider.maxValue = max;
                        slider.wholeNumbers = (format.IndexOf('.') < 0);
                        slider.value = initialValue;
                        slider.onValueChanged.RemoveAllListeners();

                        if (valTxt != null)
                        {
                            valTxt.text = string.Format(format, initialValue);
                        }

                        slider.onValueChanged.AddListener(new UnityAction<float>(delegate(float val)
                        {
                            if (valTxt != null) valTxt.text = string.Format(format, val);
                            onSlide(val);
                        }));
                    }
                    return;
                }
                catch (Exception ex)
                {
                    Debug.LogWarning("[RustPilot] CreateNativeSliderRow clone error: " + ex);
                }
            }

            CreateFallbackSliderRow(parent, labelText, initialValue, min, max, format, onSlide);
        }

        private void CreateFallbackToggleRow(Transform parent, string labelText, bool initialValue, Action<bool> onToggle)
        {
            try
            {
                GameObject rowGo = new GameObject("Row_" + labelText);
                rowGo.transform.SetParent(parent, false);

                RectTransform rt = rowGo.AddComponent<RectTransform>();
                rt.sizeDelta = new Vector2(0, 36);

                Image bg = rowGo.AddComponent<Image>();
                bg.color = new Color(0.13f, 0.14f, 0.11f, 0.65f);

                HorizontalLayoutGroup hlg = rowGo.AddComponent<HorizontalLayoutGroup>();
                hlg.padding = new RectOffset(14, 10, 3, 3);
                hlg.spacing = 10;
                hlg.childForceExpandWidth = false;
                hlg.childForceExpandHeight = true;

                LayoutElement rowLe = rowGo.AddComponent<LayoutElement>();
                rowLe.minHeight = 36;
                rowLe.preferredHeight = 36;
                rowLe.flexibleWidth = 1f;

                // 1. Setting Label (Left - Bold Uppercase, plenty of room)
                GameObject labelGo = new GameObject("Label");
                labelGo.transform.SetParent(rowGo.transform, false);
                Text label = labelGo.AddComponent<Text>();
                label.text = labelText.ToUpperInvariant();
                label.font = GetNativeFont();
                label.fontSize = 13;
                label.fontStyle = FontStyle.Bold;
                label.color = new Color(0.80f, 0.82f, 0.77f, 1.0f);
                label.alignment = TextAnchor.MiddleLeft;
                LayoutElement labelLe = labelGo.AddComponent<LayoutElement>();
                labelLe.preferredWidth = 380;
                labelLe.flexibleWidth = 1f;

                // 2. Wide Native Toggle Button (Right)
                GameObject btnGo = new GameObject("Btn");
                btnGo.transform.SetParent(rowGo.transform, false);
                Button btn = btnGo.AddComponent<Button>();
                Image btnImg = btnGo.AddComponent<Image>();
                btnImg.color = initialValue ? new Color(0.24f, 0.28f, 0.20f, 0.95f) : new Color(0.16f, 0.17f, 0.14f, 0.90f);

                GameObject btnTxtGo = new GameObject("BtnText");
                btnTxtGo.transform.SetParent(btnGo.transform, false);
                Text btnTxt = btnTxtGo.AddComponent<Text>();
                btnTxt.text = initialValue ? "ВКЛ" : "ВЫКЛ";
                btnTxt.font = GetNativeFont();
                btnTxt.fontSize = 13;
                btnTxt.fontStyle = FontStyle.Bold;
                btnTxt.alignment = TextAnchor.MiddleCenter;
                btnTxt.color = initialValue ? new Color(0.90f, 0.92f, 0.88f, 1.0f) : new Color(0.55f, 0.56f, 0.52f, 1.0f);

                RectTransform btnTxtRt = btnTxtGo.GetComponent<RectTransform>();
                btnTxtRt.anchorMin = Vector2.zero;
                btnTxtRt.anchorMax = Vector2.one;
                btnTxtRt.sizeDelta = Vector2.zero;

                LayoutElement btnLe = btnGo.AddComponent<LayoutElement>();
                btnLe.preferredWidth = 240;
                btnLe.preferredHeight = 30;

                bool curVal = initialValue;
                btn.onClick.AddListener(new UnityAction(delegate()
                {
                    curVal = !curVal;
                    btnImg.color = curVal ? new Color(0.24f, 0.28f, 0.20f, 0.95f) : new Color(0.16f, 0.17f, 0.14f, 0.90f);
                    btnTxt.text = curVal ? "ВКЛ" : "ВЫКЛ";
                    btnTxt.color = curVal ? new Color(0.90f, 0.92f, 0.88f, 1.0f) : new Color(0.55f, 0.56f, 0.52f, 1.0f);
                    onToggle(curVal);
                }));
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] CreateFallbackToggleRow error: " + ex);
            }
        }

        private void CreateFallbackSliderRow(Transform parent, string labelText, float initialValue, float min, float max, string format, Action<float> onSlide)
        {
            try
            {
                GameObject rowGo = new GameObject("Row_" + labelText);
                rowGo.transform.SetParent(parent, false);

                RectTransform rt = rowGo.AddComponent<RectTransform>();
                rt.sizeDelta = new Vector2(0, 36);

                Image bg = rowGo.AddComponent<Image>();
                bg.color = new Color(0.13f, 0.14f, 0.11f, 0.65f);

                HorizontalLayoutGroup hlg = rowGo.AddComponent<HorizontalLayoutGroup>();
                hlg.padding = new RectOffset(14, 10, 3, 3);
                hlg.spacing = 10;
                hlg.childForceExpandWidth = false;
                hlg.childForceExpandHeight = true;

                LayoutElement rowLe = rowGo.AddComponent<LayoutElement>();
                rowLe.minHeight = 36;
                rowLe.preferredHeight = 36;
                rowLe.flexibleWidth = 1f;

                // 1. Setting Label (Left - Bold Uppercase, plenty of room)
                GameObject labelGo = new GameObject("Label");
                labelGo.transform.SetParent(rowGo.transform, false);
                Text label = labelGo.AddComponent<Text>();
                label.text = labelText.ToUpperInvariant();
                label.font = GetNativeFont();
                label.fontSize = 13;
                label.fontStyle = FontStyle.Bold;
                label.color = new Color(0.80f, 0.82f, 0.77f, 1.0f);
                label.alignment = TextAnchor.MiddleLeft;
                LayoutElement labelLe = labelGo.AddComponent<LayoutElement>();
                labelLe.preferredWidth = 380;
                labelLe.flexibleWidth = 1f;

                // 2. Native Slim Slider Container
                GameObject sliderGo = new GameObject("Slider");
                sliderGo.transform.SetParent(rowGo.transform, false);
                RectTransform sliderRt = sliderGo.AddComponent<RectTransform>();
                sliderRt.sizeDelta = new Vector2(185, 18);

                LayoutElement sliderLe = sliderGo.AddComponent<LayoutElement>();
                sliderLe.preferredWidth = 185;
                sliderLe.preferredHeight = 18;

                Slider slider = sliderGo.AddComponent<Slider>();
                slider.minValue = min;
                slider.maxValue = max;
                slider.wholeNumbers = (format.IndexOf('.') < 0);
                slider.value = initialValue;

                // Slim Track Background
                GameObject trackGo = new GameObject("Background");
                trackGo.transform.SetParent(sliderGo.transform, false);
                Image trackImg = trackGo.AddComponent<Image>();
                trackImg.color = new Color(0.22f, 0.23f, 0.19f, 0.95f);
                RectTransform trackRt = trackGo.GetComponent<RectTransform>();
                trackRt.anchorMin = new Vector2(0f, 0.42f);
                trackRt.anchorMax = new Vector2(1f, 0.58f);
                trackRt.sizeDelta = Vector2.zero;

                // Fill Area
                GameObject fillAreaGo = new GameObject("Fill Area");
                fillAreaGo.transform.SetParent(sliderGo.transform, false);
                RectTransform fillAreaRt = fillAreaGo.AddComponent<RectTransform>();
                fillAreaRt.anchorMin = new Vector2(0f, 0.42f);
                fillAreaRt.anchorMax = new Vector2(1f, 0.58f);
                fillAreaRt.sizeDelta = new Vector2(-6, 0);

                GameObject fillGo = new GameObject("Fill");
                fillGo.transform.SetParent(fillAreaGo.transform, false);
                Image fillImg = fillGo.AddComponent<Image>();
                fillImg.color = new Color(0.22f, 0.23f, 0.19f, 0.95f);
                RectTransform fillRt = fillGo.GetComponent<RectTransform>();
                fillRt.sizeDelta = Vector2.zero;
                slider.fillRect = fillRt;

                // Rust Red-Orange Knob Handle
                GameObject handleAreaGo = new GameObject("Handle Slide Area");
                handleAreaGo.transform.SetParent(sliderGo.transform, false);
                RectTransform handleAreaRt = handleAreaGo.AddComponent<RectTransform>();
                handleAreaRt.anchorMin = Vector2.zero;
                handleAreaRt.anchorMax = Vector2.one;
                handleAreaRt.sizeDelta = new Vector2(-8, 0);

                GameObject handleGo = new GameObject("Handle");
                handleGo.transform.SetParent(handleAreaGo.transform, false);
                Image handleImg = handleGo.AddComponent<Image>();
                handleImg.color = new Color(0.75f, 0.30f, 0.20f, 1.0f);
                RectTransform handleRt = handleGo.GetComponent<RectTransform>();
                handleRt.sizeDelta = new Vector2(8, 18);
                slider.handleRect = handleRt;
                slider.targetGraphic = handleImg;

                // 3. Numeric Value Text (Far Right)
                GameObject valTxtGo = new GameObject("ValText");
                valTxtGo.transform.SetParent(rowGo.transform, false);
                Text valTxt = valTxtGo.AddComponent<Text>();
                valTxt.text = string.Format(format, initialValue);
                valTxt.font = GetNativeFont();
                valTxt.fontSize = 13;
                valTxt.fontStyle = FontStyle.Bold;
                valTxt.color = new Color(0.80f, 0.82f, 0.77f, 1.0f);
                valTxt.alignment = TextAnchor.MiddleRight;

                LayoutElement valLe = valTxtGo.AddComponent<LayoutElement>();
                valLe.preferredWidth = 45;
                valLe.preferredHeight = 28;

                slider.onValueChanged.AddListener(new UnityAction<float>(delegate(float val)
                {
                    valTxt.text = string.Format(format, val);
                    onSlide(val);
                }));
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] CreateFallbackSliderRow error: " + ex);
            }
        }

        private Font GetNativeFont()
        {
            Text existingText = UnityEngine.Object.FindObjectOfType<Text>();
            if (existingText != null && existingText.font != null)
            {
                return existingText.font;
            }
            return Resources.GetBuiltinResource<Font>("Arial.ttf");
        }

        #endregion

        #region Application Logic

        public void ApplyAllSettings()
        {
            ApplyGrass();
            ApplyCamera();
            ApplyShadows();
            ApplyPerformance();
            ApplyFullBright();
        }

        public void ApplyGrass()
        {
            try
            {
                ConVar.Grass.quality = grassEnabled ? grassQuality : 0f;
                ConVar.Grass.displace = grassDisplacement;
                ConVar.Decor.quality = decorQuality;
                ConVar.Tree.quality = treeQuality;
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] ApplyGrass: " + ex.Message);
            }
        }

        public void ApplyCamera()
        {
            try
            {
                ConVar.Graphics.fov = isZooming ? zoomFov : fov;
                ConVar.Graphics.dof = dofEnabled;
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] ApplyCamera: " + ex.Message);
            }
        }

        public void ApplyShadows()
        {
            try
            {
                QualitySettings.shadowDistance = shadowsEnabled ? shadowDistance : 0f;
                ConVar.Graphics.shadowcascades = shadowsEnabled ? 2 : 0;
                ConVar.Graphics.shadowdistance = shadowsEnabled ? shadowDistance : 0f;
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] ApplyShadows: " + ex.Message);
            }
        }

        public void ApplyPerformance()
        {
            try
            {
                ConVar.Water.reflections = waterReflections ? 1 : 0;
                ConVar.FPS.limit = fpsLimit;
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] ApplyPerformance: " + ex.Message);
            }
        }

        public void ApplyFullBright()
        {
            try
            {
                if (fullBright)
                {
                    RenderSettings.ambientLight = new Color(0.85f, 0.85f, 0.85f, 1f);
                    RenderSettings.ambientIntensity = 2.0f;
                }
                else
                {
                    RenderSettings.ambientLight = new Color(0.2f, 0.2f, 0.2f, 1f);
                    RenderSettings.ambientIntensity = 1.0f;
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] ApplyFullBright: " + ex.Message);
            }
        }

        public void ResetDefaults()
        {
            grassEnabled = true;
            grassQuality = 100f;
            grassDisplacement = true;
            decorQuality = 100f;
            treeQuality = 100f;

            fov = 85f;
            zoomEnabled = true;
            zoomFov = 35f;
            dofEnabled = false;

            shadowsEnabled = true;
            shadowDistance = 80f;
            waterReflections = true;
            fpsLimit = 144;
            showFpsOverlay = true;
            fullBright = false;

            crosshairEnabled = false;
            crosshairColor = Color.green;
            crosshairSize = 4;
            crosshairGap = 3;
        }

        public void SaveConfig()
        {
            try
            {
                string json = string.Format(
                    "{{\n" +
                    "  \"grassEnabled\": {0},\n" +
                    "  \"grassQuality\": {1},\n" +
                    "  \"grassDisplacement\": {2},\n" +
                    "  \"decorQuality\": {3},\n" +
                    "  \"treeQuality\": {4},\n" +
                    "  \"fov\": {5},\n" +
                    "  \"zoomEnabled\": {6},\n" +
                    "  \"zoomFov\": {7},\n" +
                    "  \"shadowsEnabled\": {8},\n" +
                    "  \"shadowDistance\": {9},\n" +
                    "  \"dofEnabled\": {10},\n" +
                    "  \"waterReflections\": {11},\n" +
                    "  \"fpsLimit\": {12},\n" +
                    "  \"showFpsOverlay\": {13},\n" +
                    "  \"fullBright\": {14},\n" +
                    "  \"crosshairEnabled\": {15},\n" +
                    "  \"crosshairSize\": {16},\n" +
                    "  \"crosshairGap\": {17}\n" +
                    "}}",
                    grassEnabled.ToString().ToLower(),
                    grassQuality.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture),
                    grassDisplacement.ToString().ToLower(),
                    decorQuality.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture),
                    treeQuality.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture),
                    fov.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture),
                    zoomEnabled.ToString().ToLower(),
                    zoomFov.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture),
                    shadowsEnabled.ToString().ToLower(),
                    shadowDistance.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture),
                    dofEnabled.ToString().ToLower(),
                    waterReflections.ToString().ToLower(),
                    fpsLimit,
                    showFpsOverlay.ToString().ToLower(),
                    fullBright.ToString().ToLower(),
                    crosshairEnabled.ToString().ToLower(),
                    crosshairSize,
                    crosshairGap
                );

                File.WriteAllText(ConfigPath, json);
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] Failed to save config: " + ex.Message);
            }
        }

        public void LoadConfig()
        {
            try
            {
                if (!File.Exists(ConfigPath)) return;
                string text = File.ReadAllText(ConfigPath);

                if (text.Contains("\"grassEnabled\": false")) grassEnabled = false;
                if (text.Contains("\"grassEnabled\": true")) grassEnabled = true;

                if (text.Contains("\"shadowsEnabled\": false")) shadowsEnabled = false;
                if (text.Contains("\"shadowsEnabled\": true")) shadowsEnabled = true;

                if (text.Contains("\"zoomEnabled\": false")) zoomEnabled = false;
                if (text.Contains("\"zoomEnabled\": true")) zoomEnabled = true;

                if (text.Contains("\"showFpsOverlay\": false")) showFpsOverlay = false;
                if (text.Contains("\"showFpsOverlay\": true")) showFpsOverlay = true;

                if (text.Contains("\"fullBright\": true")) fullBright = true;
                if (text.Contains("\"crosshairEnabled\": true")) crosshairEnabled = true;
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] Failed to load config: " + ex.Message);
            }
        }

        #endregion

        #region Fast GUI In-game Overlay (F2) & Crosshair

        private void InitStyles()
        {
            if (whitePixel == null)
            {
                whitePixel = new Texture2D(1, 1);
                whitePixel.hideFlags = HideFlags.HideAndDontSave;
                whitePixel.SetPixel(0, 0, Color.white);
                whitePixel.Apply();
            }

            if (darkBackground == null)
            {
                darkBackground = new Texture2D(1, 1);
                darkBackground.hideFlags = HideFlags.HideAndDontSave;
                darkBackground.SetPixel(0, 0, new Color(0.10f, 0.11f, 0.13f, 0.95f));
                darkBackground.Apply();
            }

            if (accentBackground == null)
            {
                accentBackground = new Texture2D(1, 1);
                accentBackground.hideFlags = HideFlags.HideAndDontSave;
                accentBackground.SetPixel(0, 0, new Color(0.85f, 0.28f, 0.15f, 1.0f));
                accentBackground.Apply();
            }

            if (boxStyle == null)
            {
                boxStyle = new GUIStyle(GUI.skin.box);
                boxStyle.normal.background = darkBackground;
            }

            if (headerStyle == null)
            {
                headerStyle = new GUIStyle(GUI.skin.label);
                headerStyle.fontSize = 15;
                headerStyle.fontStyle = FontStyle.Bold;
                headerStyle.alignment = TextAnchor.MiddleLeft;
                headerStyle.normal.textColor = new Color(0.95f, 0.45f, 0.2f);
            }

            if (tabStyle == null)
            {
                tabStyle = new GUIStyle(GUI.skin.button);
                tabStyle.fontSize = 12;
                tabStyle.fontStyle = FontStyle.Bold;
                tabStyle.fixedHeight = 28;
            }

            if (labelStyle == null)
            {
                labelStyle = new GUIStyle(GUI.skin.label);
                labelStyle.fontSize = 12;
                labelStyle.alignment = TextAnchor.MiddleLeft;
                labelStyle.normal.textColor = Color.white;
            }

            if (buttonStyle == null)
            {
                buttonStyle = new GUIStyle(GUI.skin.button);
                buttonStyle.fontSize = 12;
                buttonStyle.fontStyle = FontStyle.Bold;
                buttonStyle.fixedHeight = 26;
            }

            if (toggleStyle == null)
            {
                toggleStyle = new GUIStyle(GUI.skin.toggle);
                toggleStyle.fontSize = 12;
                toggleStyle.normal.textColor = Color.white;
            }
        }

        private void OnGUI()
        {
            if (LoadingScreen.isOpen) return;
            if (!MainMenuSystem.isOpen && !LevelManager.isLoaded) return;

            InitStyles();

            // FPS Overlay
            if (showFpsOverlay)
            {
                DrawFpsOverlay();
            }

            // Crosshair
            if (crosshairEnabled)
            {
                DrawCrosshair();
            }

            // Ingame F2 Tweak Overlay
            if (isVisible)
            {
                windowRect = GUI.Window(99824, windowRect, DrawOverlayWindow, "⚡ RustPilot Tweaks (Devblog 65) - TEAM_RUST_PLUGINS", boxStyle);
            }
        }

        private void DrawOverlayWindow(int windowID)
        {
            GUILayout.Space(8);

            // Navigation Tabs
            GUILayout.BeginHorizontal();
            for (int i = 0; i < tabNames.Length; i++)
            {
                bool isSelected = (activeTab == i);
                GUI.backgroundColor = isSelected ? new Color(0.9f, 0.35f, 0.15f) : new Color(0.2f, 0.22f, 0.25f);

                if (GUILayout.Button(tabNames[i], tabStyle))
                {
                    activeTab = i;
                }
            }
            GUI.backgroundColor = Color.white;
            GUILayout.EndHorizontal();

            GUILayout.Space(12);

            // Tab Contents
            switch (activeTab)
            {
                case 0:
                    DrawEnvironmentTab();
                    break;
                case 1:
                    DrawCameraTab();
                    break;
                case 2:
                    DrawFpsTab();
                    break;
                case 3:
                    DrawCrosshairTab();
                    break;
                case 4:
                    DrawAboutTab();
                    break;
            }

            GUILayout.FlexibleSpace();

            // Bottom Actions
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("🔄 Сбросить настройки", buttonStyle, GUILayout.Width(160)))
            {
                ResetDefaults();
                ApplyAllSettings();
                SaveConfig();
            }

            GUILayout.FlexibleSpace();

            if (GUILayout.Button("💾 Сохранить", buttonStyle, GUILayout.Width(120)))
            {
                ApplyAllSettings();
                SaveConfig();
            }

            if (GUILayout.Button("❌ Закрыть (F2)", buttonStyle, GUILayout.Width(120)))
            {
                isVisible = false;
            }
            GUILayout.EndHorizontal();

            GUI.DragWindow(new Rect(0, 0, 10000, 25));
        }

        private void DrawEnvironmentTab()
        {
            GUILayout.Label("<b>🌿 Настройки растительности и окружения</b>", headerStyle);
            GUILayout.Space(4);

            bool newGrass = GUILayout.Toggle(grassEnabled, " Включить траву (Quick Toggle: F3)", toggleStyle);
            if (newGrass != grassEnabled)
            {
                grassEnabled = newGrass;
                ApplyGrass();
            }

            GUILayout.Space(6);
            GUILayout.Label(string.Format("Качество травы: {0:0}%", grassQuality), labelStyle);
            float newGq = GUILayout.HorizontalSlider(grassQuality, 0f, 100f);
            if (Mathf.Abs(newGq - grassQuality) > 0.5f)
            {
                grassQuality = newGq;
                ApplyGrass();
            }

            GUILayout.Space(6);
            bool newDisp = GUILayout.Toggle(grassDisplacement, " Приминание травы игроком", toggleStyle);
            if (newDisp != grassDisplacement)
            {
                grassDisplacement = newDisp;
                ApplyGrass();
            }

            GUILayout.Space(6);
            GUILayout.Label(string.Format("Качество декораций: {0:0}%", decorQuality), labelStyle);
            float newDq = GUILayout.HorizontalSlider(decorQuality, 0f, 100f);
            if (Mathf.Abs(newDq - decorQuality) > 0.5f)
            {
                decorQuality = newDq;
                ApplyGrass();
            }

            GUILayout.Space(6);
            GUILayout.Label(string.Format("Качество деревьев: {0:0}%", treeQuality), labelStyle);
            float newTq = GUILayout.HorizontalSlider(treeQuality, 0f, 100f);
            if (Mathf.Abs(newTq - treeQuality) > 0.5f)
            {
                treeQuality = newTq;
                ApplyGrass();
            }
        }

        private void DrawCameraTab()
        {
            GUILayout.Label("<b>👁️ Поле зрения (FOV) и Зум</b>", headerStyle);
            GUILayout.Space(4);

            GUILayout.Label(string.Format("Угол обзора (FOV): {0:0}", fov), labelStyle);
            float newFov = GUILayout.HorizontalSlider(fov, 65f, 110f);
            if (Mathf.Abs(newFov - fov) > 0.5f)
            {
                fov = newFov;
                ApplyCamera();
            }

            GUILayout.Space(8);
            zoomEnabled = GUILayout.Toggle(zoomEnabled, " Включить быстрый зум на зажатие клавиши 'Z'", toggleStyle);

            GUILayout.Space(4);
            GUILayout.Label(string.Format("Кратность зума FOV: {0:0}", zoomFov), labelStyle);
            zoomFov = GUILayout.HorizontalSlider(zoomFov, 15f, 50f);

            GUILayout.Space(8);
            bool newDof = GUILayout.Toggle(dofEnabled, " Глубина резкости (Depth of Field)", toggleStyle);
            if (newDof != dofEnabled)
            {
                dofEnabled = newDof;
                ApplyCamera();
            }
        }

        private void DrawFpsTab()
        {
            GUILayout.Label("<b>⚡ Оптимизация производительности (FPS Boost)</b>", headerStyle);
            GUILayout.Space(4);

            bool newShadows = GUILayout.Toggle(shadowsEnabled, " Динамические тени", toggleStyle);
            if (newShadows != shadowsEnabled)
            {
                shadowsEnabled = newShadows;
                ApplyShadows();
            }

            GUILayout.Space(6);
            GUILayout.Label(string.Format("Дальность теней: {0:0} м", shadowDistance), labelStyle);
            float newSd = GUILayout.HorizontalSlider(shadowDistance, 0f, 200f);
            if (Mathf.Abs(newSd - shadowDistance) > 1f)
            {
                shadowDistance = newSd;
                ApplyShadows();
            }

            GUILayout.Space(6);
            bool newRefl = GUILayout.Toggle(waterReflections, " Отражения на воде", toggleStyle);
            if (newRefl != waterReflections)
            {
                waterReflections = newRefl;
                ApplyPerformance();
            }

            GUILayout.Space(6);
            GUILayout.Label(string.Format("Ограничение FPS: {0}", fpsLimit), labelStyle);
            fpsLimit = (int)GUILayout.HorizontalSlider(fpsLimit, 30f, 300f);
            ApplyPerformance();

            GUILayout.Space(6);
            showFpsOverlay = GUILayout.Toggle(showFpsOverlay, " Отображать FPS оверлей в углу экрана", toggleStyle);

            GUILayout.Space(6);
            bool newFb = GUILayout.Toggle(fullBright, " Ночной режим подсветки (FullBright / Gamma Boost)", toggleStyle);
            if (newFb != fullBright)
            {
                fullBright = newFb;
                ApplyFullBright();
            }
        }

        private void DrawCrosshairTab()
        {
            GUILayout.Label("<b>🎯 Настройки прицела</b>", headerStyle);
            GUILayout.Space(4);

            crosshairEnabled = GUILayout.Toggle(crosshairEnabled, " Отображать перекрестие по центру экрана", toggleStyle);

            GUILayout.Space(6);
            GUILayout.Label(string.Format("Размер перекрестия: {0} px", crosshairSize), labelStyle);
            crosshairSize = (int)GUILayout.HorizontalSlider(crosshairSize, 2f, 15f);

            GUILayout.Space(6);
            GUILayout.Label(string.Format("Зазор перекрестия: {0} px", crosshairGap), labelStyle);
            crosshairGap = (int)GUILayout.HorizontalSlider(crosshairGap, 1f, 12f);

            GUILayout.Space(6);
            GUILayout.Label("Цвет прицела:", labelStyle);
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("Зеленый", buttonStyle)) crosshairColor = Color.green;
            if (GUILayout.Button("Красный", buttonStyle)) crosshairColor = Color.red;
            if (GUILayout.Button("Голубой", buttonStyle)) crosshairColor = Color.cyan;
            if (GUILayout.Button("Желтый", buttonStyle)) crosshairColor = Color.yellow;
            if (GUILayout.Button("Белый", buttonStyle)) crosshairColor = Color.white;
            GUILayout.EndHorizontal();
        }

        private void DrawAboutTab()
        {
            GUILayout.Label("<b>ℹ️ Информация о модификации</b>", headerStyle);
            GUILayout.Space(6);

            GUILayout.Label("<b>Продукт:</b> RustPilot Client Mod (Devblog 65)", labelStyle);
            GUILayout.Label("<b>Разработчик:</b> TEAM_RUST_PLUGINS", labelStyle);
            GUILayout.Label("<b>Версия:</b> 1.0.0 (Release Edition)", labelStyle);
            GUILayout.Space(6);

            GUILayout.Label("<b>Горячие клавиши:</b>", labelStyle);
            GUILayout.Label("• <b>[ F2 ]</b> — Открыть / закрыть меню настроек RustPilot", labelStyle);
            GUILayout.Label("• <b>[ F3 ]</b> — Быстрое включение / выключение травы", labelStyle);
            GUILayout.Label("• <b>[ Z (Удержание) ]</b> — Оптический зум (Scope Zoom)", labelStyle);
            GUILayout.Space(6);

            GUILayout.Label("<b>Интеграция:</b>", labelStyle);
            GUILayout.Label("Все настройки также встроены во вкладку <b>'TRP ТВИКИ'</b> в родном меню настроек игры (ESC / Options).", labelStyle);
        }

        private void DrawFpsOverlay()
        {
            string fpsText = string.Format("FPS: {0:0}", currentFps);
            Rect fpsRect = new Rect(Screen.width - 110, 10, 95, 24);

            Color prevBg = GUI.backgroundColor;
            GUI.backgroundColor = new Color(0, 0, 0, 0.7f);
            GUI.Box(fpsRect, "");

            GUIStyle fpsStyle = new GUIStyle(labelStyle)
            {
                fontSize = 12,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = (currentFps >= 60f) ? Color.green : ((currentFps >= 30f) ? Color.yellow : Color.red) }
            };

            GUI.Label(fpsRect, fpsText, fpsStyle);
            GUI.backgroundColor = prevBg;
        }

        private void DrawCrosshair()
        {
            if (whitePixel == null) return;

            float centerX = Screen.width / 2f;
            float centerY = Screen.height / 2f;

            Color prevColor = GUI.color;
            GUI.color = crosshairColor;

            // Top bar
            GUI.DrawTexture(new Rect(centerX - (crosshairSize / 2f), centerY - crosshairGap - crosshairSize, crosshairSize, crosshairSize), whitePixel);
            // Bottom bar
            GUI.DrawTexture(new Rect(centerX - (crosshairSize / 2f), centerY + crosshairGap, crosshairSize, crosshairSize), whitePixel);
            // Left bar
            GUI.DrawTexture(new Rect(centerX - crosshairGap - crosshairSize, centerY - (crosshairSize / 2f), crosshairSize, crosshairSize), whitePixel);
            // Right bar
            GUI.DrawTexture(new Rect(centerX + crosshairGap, centerY - (crosshairSize / 2f), crosshairSize, crosshairSize), whitePixel);

            // Center dot
            GUI.DrawTexture(new Rect(centerX - 1, centerY - 1, 2, 2), whitePixel);

            GUI.color = prevColor;
        }

        #endregion
    }
}
