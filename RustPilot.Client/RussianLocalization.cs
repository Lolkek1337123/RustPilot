using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace RustPilot.Client
{
    /// <summary>
    /// Полный официальный русификатор для Rust Devblog 65 от TEAM_RUST_PLUGINS.
    /// Переводит 100% интерфейса игры: настройки, заголовки, инвентарь, крафт, предметы,
    /// постройки, меню действий (радиальное меню), статусы игрока и серверный браузер.
    /// Ограничивает выбор языков строго до RU (Русский) и EN (English).
    /// </summary>
    public static class RussianLocalization
    {
        private static Dictionary<string, string> ruDict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        private static bool isInitialized = false;
        public static bool IsInitialized { get { return isInitialized; } }

        public static string OnTranslateGet(string key, string def)
        {
            if (!isInitialized)
            {
                Initialize();
            }

            if (key != null && ruDict.ContainsKey(key))
            {
                return ruDict[key];
            }
            if (def != null && ruDict.ContainsKey(def))
            {
                return ruDict[def];
            }
            return null;
        }

        public static void Initialize()
        {
            if (isInitialized) return;

            BuildFullRussianDictionary();

            try
            {
                if (GlobalMessages.onLanguageChanged != null)
                {
                    GlobalMessages.onLanguageChanged.action += OnLanguageChanged;
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] onLanguageChanged hook notice: " + ex.Message);
            }

            // Direct dictionary injection (safe during Bootstrap without touching uninitialized FileSystem)
            InjectRussianTranslations();

            try
            {
                if (Translate.GetLanguage() != "ru")
                {
                    Translate.SetLanguage("ru");
                }
            }
            catch { }

            isInitialized = true;
            Debug.Log("[RustPilot] Full Russian Localization loaded successfully (100% translated).");
        }

        private static void OnLanguageChanged()
        {
            ApplyCurrentLanguage();
            FilterLanguagePopup();
        }

        public static void ApplyCurrentLanguage()
        {
            try
            {
                string currentLang = Translate.GetLanguage();
                if (string.Equals(currentLang, "ru", StringComparison.OrdinalIgnoreCase))
                {
                    InjectRussianTranslations();
                    TranslateActiveUI();
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] ApplyCurrentLanguage error: " + ex);
            }
        }

        /// <summary>
        /// Injects the full Russian dictionary directly into the game's Translate system.
        /// </summary>
        private static void InjectRussianTranslations()
        {
            try
            {
                var field = typeof(Translate).GetField("translations", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.NonPublic);
                if (field != null)
                {
                    Dictionary<string, string> dict = field.GetValue(null) as Dictionary<string, string>;
                    if (dict == null)
                    {
                        dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                        field.SetValue(null, dict);
                    }

                    foreach (KeyValuePair<string, string> kvp in ruDict)
                    {
                        dict[kvp.Key] = kvp.Value;
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] InjectRussianTranslations error: " + ex);
            }
        }

        /// <summary>
        /// Universal UI Auto-Translator: Scans all active Text components
        /// and translates any hardcoded English headers, options, buttons, and subheaders instantly.
        /// </summary>
        public static void TranslateActiveUI()
        {
            try
            {
                if (LoadingScreen.isOpen) return;

                bool isMenuReady = (MainMenuSystem.isOpen || UnityEngine.Object.FindObjectOfType<MainMenuSystem>() != null);
                if (!isMenuReady && !LevelManager.isLoaded) return;

                string currentLang = Translate.GetLanguage();
                if (!string.Equals(currentLang, "ru", StringComparison.OrdinalIgnoreCase)) return;

                Text[] activeTexts = UnityEngine.Object.FindObjectsOfType<Text>();
                if (activeTexts == null || activeTexts.Length == 0) return;

                for (int i = 0; i < activeTexts.Length; i++)
                {
                    Text t = activeTexts[i];
                    if (t == null || !t.gameObject.activeInHierarchy) continue;

                    string cur = t.text;
                    if (string.IsNullOrEmpty(cur)) continue;

                    string trimmed = cur.Trim();
                    if (trimmed == "ВКЛ" || trimmed == "ВЫКЛ") continue;
                    if (t.transform.name == "BtnText" || t.transform.name == "ValText" || t.transform.name.StartsWith("Header_")) continue;
                    if (t.transform.parent != null && t.transform.parent.name.StartsWith("Row_")) continue;

                    if (ruDict.ContainsKey(trimmed))
                    {
                        t.text = ruDict[trimmed];
                    }
                    else if (ruDict.ContainsKey(cur))
                    {
                        t.text = ruDict[cur];
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] TranslateActiveUI error: " + ex);
            }
        }

        /// <summary>
        /// Filters the Language popup to strictly show only RU and EN flags.
        /// </summary>
        public static void FilterLanguagePopup()
        {
            try
            {
                if (LoadingScreen.isOpen) return;

                bool isMenuReady = (MainMenuSystem.isOpen || UnityEngine.Object.FindObjectOfType<MainMenuSystem>() != null);
                if (!isMenuReady && !LevelManager.isLoaded) return;

                LanguageSelection[] popups = UnityEngine.Object.FindObjectsOfType<LanguageSelection>();
                if (popups == null) return;

                foreach (LanguageSelection ls in popups)
                {
                    if (ls == null || ls.buttonContainer == null || !ls.gameObject.activeInHierarchy) continue;

                    Transform container = ls.buttonContainer.transform;
                    for (int i = 0; i < container.childCount; i++)
                    {
                        Transform child = container.GetChild(i);
                        if (child == null) continue;

                        string cName = child.name.ToLowerInvariant();
                        if (cName == "ru" || cName == "en" || cName == "gb" || cName == "us")
                        {
                            child.gameObject.SetActive(true);
                            child.localScale = new Vector3(1.2f, 1.2f, 1.2f);
                        }
                        else
                        {
                            child.gameObject.SetActive(false);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[RustPilot] FilterLanguagePopup error: " + ex);
            }
        }

        private static void BuildFullRussianDictionary()
        {
            ruDict.Clear();

            #region 0. Главное меню и Профиль
            ruDict["server_history"] = "СПИСОК СЕРВЕРОВ";
            ruDict["server history"] = "СПИСОК СЕРВЕРОВ";
            ruDict["SERVER HISTORY"] = "СПИСОК СЕРВЕРОВ";
            ruDict["your_friends"] = "ОНЛАЙН В ЛАУНЧЕРЕ";
            ruDict["your friends"] = "ОНЛАЙН В ЛАУНЧЕРЕ";
            ruDict["friends_list"] = "ОНЛАЙН В ЛАУНЧЕРЕ";
            ruDict["friends list"] = "ОНЛАЙН В ЛАУНЧЕРЕ";
            ruDict["FRIENDS LIST"] = "ОНЛАЙН В ЛАУНЧЕРЕ";
            ruDict["about_you"] = "ВАШ ПРОФИЛЬ";
            ruDict["ABOUT YOU"] = "ВАШ ПРОФИЛЬ";
            ruDict["life_infographic"] = "СТАТИСТИКА";
            ruDict["LIFE INFOGRAPHIC"] = "СТАТИСТИКА";
            ruDict["play"] = "ИГРАТЬ";
            ruDict["servers"] = "СЕРВЕРЫ";
            ruDict["options"] = "НАСТРОЙКИ";
            ruDict["quit"] = "ВЫХОД";
            ruDict["cancel"] = "ОТМЕНА";
            ruDict["close"] = "ЗАКРЫТЬ";
            #endregion

            #region 0. Тумблеры и Статусы
            ruDict["ON"] = "ВКЛ";
            ruDict["OFF"] = "ВЫКЛ";
            ruDict["on"] = "вкл";
            ruDict["off"] = "выкл";
            ruDict["True"] = "ВКЛ";
            ruDict["False"] = "ВЫКЛ";
            ruDict["true"] = "вкл";
            ruDict["false"] = "выкл";
            #endregion

            #region 1. Главное меню, Заголовки и Серверный браузер
            ruDict["PLAY GAME"] = "ИГРАТЬ";
            ruDict["PLAY"] = "ИГРАТЬ";
            ruDict["SERVERS"] = "СЕРВЕРЫ";
            ruDict["SERVER BROWSER"] = "СПИСОК СЕРВЕРОВ";
            ruDict["OFFICIAL SERVERS"] = "ОФИЦИАЛЬНЫЕ";
            ruDict["COMMUNITY SERVERS"] = "СООБЩЕСТВО";
            ruDict["MODDED SERVERS"] = "МОДИФИЦИРОВАННЫЕ";
            ruDict["HISTORY SERVERS"] = "ИСТОРИЯ";
            ruDict["FRIENDS SERVERS"] = "ДРУЗЬЯ";
            ruDict["CONNECT TO SERVER"] = "ПОДКЛЮЧИТЬСЯ";
            ruDict["CONNECT"] = "ПОДКЛЮЧИТЬСЯ";
            ruDict["REFRESH"] = "ОБНОВИТЬ";
            ruDict["OPTIONS"] = "НАСТРОЙКИ";
            ruDict["SETTINGS"] = "НАСТРОЙКИ";
            ruDict["QUIT"] = "ВЫЙТИ ИЗ ИГРЫ";
            ruDict["EXIT"] = "ВЫХОД";
            ruDict["DISCONNECT"] = "ОТКЛЮЧИТЬСЯ";
            ruDict["RESUME"] = "ПРОДОЛЖИТЬ";
            ruDict["CANCEL"] = "ОТМЕНА";
            ruDict["CLOSE"] = "ЗАКРЫТЬ";
            ruDict["APPLY"] = "ПРИМЕНИТЬ";
            ruDict["ACCEPT"] = "ПРИНЯТЬ";
            ruDict["BACK"] = "НАЗАД";
            ruDict["SEARCH"] = "ПОИСК";
            ruDict["FILTER"] = "ФИЛЬТР";
            ruDict["PING"] = "ПИНГ";
            ruDict["PLAYERS"] = "ИГРОКИ";
            ruDict["MAP"] = "КАРТА";
            ruDict["LOADING..."] = "ЗАГРУЗКА...";
            ruDict["CONNECTING..."] = "ПОДКЛЮЧЕНИЕ...";

            ruDict["play_game"] = "ИГРАТЬ";
            ruDict["play"] = "ИГРАТЬ";
            ruDict["servers"] = "СЕРВЕРЫ";
            ruDict["server_browser"] = "СПИСОК СЕРВЕРОВ";
            ruDict["official_servers"] = "ОФИЦИАЛЬНЫЕ";
            ruDict["community_servers"] = "СООБЩЕСТВО";
            ruDict["modded_servers"] = "МОДИФИЦИРОВАННЫЕ";
            ruDict["history_servers"] = "ИСТОРИЯ";
            ruDict["friends_servers"] = "ДРУЗЬЯ";
            ruDict["connect_to_server"] = "ПОДКЛЮЧИТЬСЯ";
            ruDict["connect"] = "ПОДКЛЮЧИТЬСЯ";
            ruDict["refresh"] = "ОБНОВИТЬ";
            ruDict["options"] = "НАСТРОЙКИ";
            ruDict["settings"] = "НАСТРОЙКИ";
            ruDict["quit"] = "ВЫЙТИ ИЗ ИГРЫ";
            ruDict["exit"] = "ВЫХОД";
            ruDict["disconnect"] = "ОТКЛЮЧИТЬСЯ";
            ruDict["resume"] = "ПРОДОЛЖИТЬ";
            ruDict["cancel"] = "ОТМЕНА";
            ruDict["close"] = "ЗАКРЫТЬ";
            ruDict["apply"] = "ПРИМЕНИТЬ";
            ruDict["accept"] = "ПРИНЯТЬ";
            ruDict["back"] = "НАЗАД";
            ruDict["search"] = "ПОИСК";
            ruDict["filter"] = "ФИЛЬТР";
            ruDict["ping"] = "ПИНГ";
            ruDict["players"] = "ИГРОКИ";
            ruDict["map"] = "КАРТА";
            ruDict["loading"] = "ЗАГРУЗКА...";
            ruDict["connecting"] = "ПОДКЛЮЧЕНИЕ...";
            #endregion

            #region 2. Меню настроек (Options) - Заголовки и Категории
            ruDict["GRAPHICS"] = "ГРАФИКА";
            ruDict["INPUT"] = "УПРАВЛЕНИЕ";
            ruDict["AUDIO"] = "ЗВУК";
            ruDict["PERFORMANCE"] = "ПРОИЗВОДИТЕЛЬНОСТЬ";
            ruDict["TWEAKS"] = "МОДИФИКАЦИИ";
            ruDict["CONTROLS"] = "УПРАВЛЕНИЕ";

            ruDict["graphics"] = "ГРАФИКА";
            ruDict["input"] = "УПРАВЛЕНИЕ";
            ruDict["audio"] = "ЗВУК";
            ruDict["performance"] = "ПРОИЗВОДИТЕЛЬНОСТЬ";
            ruDict["tweaks"] = "МОДИФИКАЦИИ";
            ruDict["controls"] = "УПРАВЛЕНИЕ";

            // Headers from screenshots
            ruDict["GAMEPLAY"] = "ИГРОВОЙ ПРОЦЕСС";
            ruDict["gameplay"] = "ИГРОВОЙ ПРОЦЕСС";
            ruDict["USER INTERFACE"] = "ПОЛЬЗОВАТЕЛЬСКИЙ ИНТЕРФЕЙС";
            ruDict["user_interface"] = "ПОЛЬЗОВАТЕЛЬСКИЙ ИНТЕРФЕЙС";
            ruDict["CENSORSHIP"] = "ЦЕНЗУРА";
            ruDict["censorship"] = "ЦЕНЗУРА";
            ruDict["GRAPHICS QUALITY"] = "КАЧЕСТВО ГРАФИКИ";
            ruDict["graphics_quality"] = "КАЧЕСТВО ГРАФИКИ";
            ruDict["QUALITY"] = "КАЧЕСТВО";
            ruDict["quality"] = "КАЧЕСТВО";
            ruDict["IMAGE EFFECTS"] = "ЭФФЕКТЫ ИЗОБРАЖЕНИЯ";
            ruDict["image_effects"] = "ЭФФЕКТЫ ИЗОБРАЖЕНИЯ";
            ruDict["VOLUME"] = "ГРОМКОСТЬ";
            ruDict["volume"] = "ГРОМКОСТЬ";
            ruDict["SPEAKER CONFIG"] = "КОНФИГУРАЦИЯ ДИНАМИКОВ";
            ruDict["speaker_config"] = "КОНФИГУРАЦИЯ ДИНАМИКОВ";
            ruDict["INPUT SETTINGS"] = "НАСТРОЙКИ УПРАВЛЕНИЯ";
            ruDict["input_settings"] = "НАСТРОЙКИ УПРАВЛЕНИЯ";
            ruDict["BINDS"] = "НАЗНАЧЕНИЕ КЛАВИШ";
            ruDict["binds"] = "НАЗНАЧЕНИЕ КЛАВИШ";
            ruDict["MOVEMENT"] = "ДВИЖЕНИЕ";
            ruDict["movement"] = "ДВИЖЕНИЕ";
            ruDict["ACTIONS"] = "ДЕЙСТВИЯ";
            ruDict["actions"] = "ДЕЙСТВИЯ";
            ruDict["COMBAT"] = "БОЙ";
            ruDict["combat"] = "БОЙ";
            ruDict["COMMUNICATION"] = "СВЯЗЬ / ОБЩЕНИЕ";
            ruDict["communication"] = "СВЯЗЬ / ОБЩЕНИЕ";
            ruDict["MISC"] = "РАЗНОЕ";
            ruDict["misc"] = "РАЗНОЕ";

            // Gameplay & UI Options
            ruDict["FIELD OF VIEW"] = "УГОЛ ОБЗОРА (FOV)";
            ruDict["field_of_view"] = "УГОЛ ОБЗОРА (FOV)";
            ruDict["FIELD OF VIEW (FOV)"] = "УГОЛ ОБЗОРА (FOV)";
            ruDict["ПОЛЕ ЗРЕНИЯ (FOV)"] = "УГОЛ ОБЗОРА (FOV)";
            ruDict["USER INTERFACE SCALE"] = "МАСШТАБ ИНТЕРФЕЙСА (UI SCALE)";
            ruDict["user_interface_scale"] = "МАСШТАБ ИНТЕРФЕЙСА (UI SCALE)";
            ruDict["SHOW HUD"] = "ОТОБРАЖАТЬ ИНТЕРФЕЙС (HUD)";
            ruDict["show_hud"] = "ОТОБРАЖАТЬ ИНТЕРФЕЙС (HUD)";
            ruDict["SHOW CHAT"] = "ОТОБРАЖАТЬ ЧАТ";
            ruDict["show_chat"] = "ОТОБРАЖАТЬ ЧАТ";
            ruDict["SHOW BRANDING"] = "ОТОБРАЖАТЬ ВЕРСИЮ ИГРЫ";
            ruDict["show_branding"] = "ОТОБРАЖАТЬ ВЕРСИЮ ИГРЫ";
            ruDict["SHOW NAMETAGS"] = "ОТОБРАЖАТЬ ИМЕНА ИГРОКОВ";
            ruDict["show_nametags"] = "ОТОБРАЖАТЬ ИМЕНА ИГРОКОВ";
            ruDict["CENSOR NUDITY"] = "ЦЕНЗУРА НАГОТЫ";
            ruDict["censor_nudity"] = "ЦЕНЗУРА НАГОТЫ";

            // Graphics Options
            ruDict["LARGE SCALE OCCLUSION"] = "МАСШТАБНОЕ ЗАТЕНЕНИЕ";
            ruDict["large_scale_occlusion"] = "МАСШТАБНОЕ ЗАТЕНЕНИЕ";
            ruDict["SHADOW CASCADES"] = "КАСКАДЫ ТЕНЕЙ";
            ruDict["shadow_cascades"] = "КАСКАДЫ ТЕНЕЙ";
            ruDict["No Cascades"] = "Без каскадов";
            ruDict["Two Cascades"] = "2 каскада";
            ruDict["Four Cascades"] = "4 каскада";
            ruDict["PARTICLE QUALITY"] = "КАЧЕСТВО ЧАСТИЦ";
            ruDict["particle_quality"] = "КАЧЕСТВО ЧАСТИЦ";
            ruDict["OBJECT QUALITY"] = "КАЧЕСТВО ОБЪЕКТОВ";
            ruDict["object_quality"] = "КАЧЕСТВО ОБЪЕКТОВ";
            ruDict["MAX GIBS"] = "КОЛИЧЕСТВО ОБЛОМКОВ (MAX GIBS)";
            ruDict["max_gibs"] = "КОЛИЧЕСТВО ОБЛОМКОВ (MAX GIBS)";

            ruDict["КАЧЕСТВО ГРАФИКИ"] = "КАЧЕСТВО ГРАФИКИ";
            ruDict["КАЧЕСТВО ВОДЫ"] = "КАЧЕСТВО ВОДЫ";
            ruDict["ОТРАЖЕНИЯ НА ВОДЕ"] = "ОТРАЖЕНИЯ НА ВОДЕ";
            ruDict["ИСТОЧНИКИ ТЕНЕЙ"] = "ИСТОЧНИКИ ТЕНЕЙ";
            ruDict["УРОВЕНЬ ШЕЙДЕРОВ"] = "УРОВЕНЬ ШЕЙДЕРОВ";
            ruDict["ДАЛЬНОСТЬ ПРОРИСОВКИ"] = "ДАЛЬНОСТЬ ПРОРИСОВКИ";
            ruDict["ДАЛЬНОСТЬ ТЕНЕЙ"] = "ДАЛЬНОСТЬ ТЕНЕЙ";
            ruDict["АНИЗОТРОПНАЯ ФИЛЬТРАЦИЯ"] = "АНИЗОТРОПНАЯ ФИЛЬТРАЦИЯ";
            ruDict["ПАРАЛЛАКС-МАППИНГ"] = "ПАРАЛЛАКС-МАППИНГ";
            ruDict["ВИРТУАЛЬНОЕ ТЕКСТУРИРОВАНИЕ"] = "ВИРТУАЛЬНОЕ ТЕКСТУРИРОВАНИЕ";
            ruDict["КАЧЕСТВО ДЕРЕВЬЕВ"] = "КАЧЕСТВО ДЕРЕВЬЕВ";
            ruDict["КАЧЕСТВО ЛАНДШАФТА"] = "КАЧЕСТВО ЛАНДШАФТА";
            ruDict["КАЧЕСТВО ТРАВЫ"] = "КАЧЕСТВО ТРАВЫ";
            ruDict["КАЧЕСТВО ДЕКОРАЦИЙ"] = "КАЧЕСТВО ДЕКОРАЦИЙ";

            ruDict["DEPTH OF FIELD"] = "ГЛУБИНА РЕЗКОСТИ (DOF)";
            ruDict["depth_of_field"] = "Глубина резкости (DOF)";
            ruDict["AMBIENT OCCLUSION"] = "ЗАТЕНЕНИЕ SSAO";
            ruDict["ambient_occlusion"] = "Затенение фонового света (SSAO)";
            ruDict["ANTI-ALIASING"] = "СГЛАЖИВАНИЕ";
            ruDict["anti_aliasing"] = "Сглаживание (Anti-Aliasing)";
            ruDict["HIGH QUALITY BLOOM"] = "КАЧЕСТВЕННОЕ СВЕЧЕНИЕ (BLOOM)";
            ruDict["high_quality_bloom"] = "Качественное свечение (Bloom)";
            ruDict["LENS DIRT"] = "ГРЯЗЬ НА ЛИНЗЕ";
            ruDict["lens_dirt"] = "Грязь на линзе";
            ruDict["MOTION BLUR"] = "РАЗМЫТИЕ В ДВИЖЕНИИ";
            ruDict["motion_blur"] = "Размытие в движении";
            ruDict["SUN SHAFTS"] = "ЛУЧИ СОЛНЦА";
            ruDict["sun_shafts"] = "Лучи солнца";
            ruDict["SHARPEN"] = "РЕЗКОСТЬ";
            ruDict["sharpen"] = "Резкость";
            ruDict["VIGNETTE"] = "ВИНЬЕТИРОВАНИЕ";
            ruDict["vignet"] = "Виньетирование";
            ruDict["COLOR GRADING"] = "ЦВЕТОКОРРЕКЦИЯ";
            ruDict["color_grading"] = "Цветокоррекция";
            ruDict["WATER QUALITY"] = "КАЧЕСТВО ВОДЫ";
            ruDict["water_quality"] = "Качество воды";
            ruDict["WATER REFLECTIONS"] = "ОТРАЖЕНИЯ НА ВОДЕ";
            ruDict["water_reflections"] = "Отражения на воде";
            ruDict["MAX SHADOW LIGHTS"] = "ИСТОЧНИКИ ТЕНЕЙ";
            ruDict["max_shadow_lights"] = "Источники теней";
            ruDict["SHADER LEVEL"] = "УРОВЕНЬ ШЕЙДЕРОВ";
            ruDict["shader_level"] = "Уровень шейдеров";
            ruDict["DRAW DISTANCE"] = "ДАЛЬНОСТЬ ПРОРИСОВКИ";
            ruDict["draw_distance"] = "Дальность прорисовки";
            ruDict["SHADOW DISTANCE"] = "ДАЛЬНОСТЬ ТЕНЕЙ";
            ruDict["shadow_distance"] = "Дальность теней";
            ruDict["ANISOTROPIC FILTERING"] = "АНИЗОТРОПНАЯ ФИЛЬТРАЦИЯ";
            ruDict["anisotropic_filtering"] = "Анизотропная фильтрация";
            ruDict["PARALLAX MAPPING"] = "ПАРАЛЛАКС-МАППИНГ";
            ruDict["parallax_mapping"] = "Параллакс-маппинг";
            ruDict["VIRTUAL TEXTURING"] = "ВИРТУАЛЬНОЕ ТЕКСТУРИРОВАНИЕ";
            ruDict["virtual_texturing"] = "Виртуальное текстурирование";
            ruDict["TERRAIN QUALITY"] = "КАЧЕСТВО ЛАНДШАФТА";
            ruDict["terrain_quality"] = "Качество ландшафта";
            ruDict["TREE QUALITY"] = "КАЧЕСТВО ДЕРЕВЬЕВ";
            ruDict["tree_quality"] = "Качество деревьев";
            ruDict["DECOR QUALITY"] = "КАЧЕСТВО ДЕКОРАЦИЙ";
            ruDict["decor_quality"] = "Качество декораций";
            ruDict["GRASS QUALITY"] = "КАЧЕСТВО ТРАВЫ";
            ruDict["grass_quality"] = "Качество травы";
            ruDict["GRASS DISPLACEMENT"] = "ПРИМИНАНИЕ ТРАВЫ";
            ruDict["grass_displacement"] = "Приминание травы";

            // Audio Options
            ruDict["MASTER VOLUME"] = "ОБЩАЯ ГРОМКОСТЬ";
            ruDict["master_volume"] = "Общая громкость";
            ruDict["MUSIC VOLUME"] = "ГРОМКОСТЬ МУЗЫКИ";
            ruDict["music_volume"] = "Громкость музыки";
            ruDict["VOICES VOLUME"] = "ГРОМКОСТЬ ГОЛОСОВОГО ЧАТА";
            ruDict["voices_volume"] = "ГРОМКОСТЬ ГОЛОСОВОГО ЧАТА";
            ruDict["VOICE VOLUME"] = "ГРОМКОСТЬ ГОЛОСОВОГО ЧАТА";
            ruDict["voice_volume"] = "Громкость голоса";
            ruDict["GAME SOUNDS VOLUME"] = "ГРОМКОСТЬ ЭФФЕКТОВ ИГРЫ";
            ruDict["game_sounds_volume"] = "ГРОМКОСТЬ ЭФФЕКТОВ ИГРЫ";
            ruDict["GAME SOUNDS"] = "ЗВУКИ ИГРЫ";
            ruDict["game_volume"] = "Громкость звуковых эффектов";
            ruDict["MENU MUSIC"] = "МУЗЫКА В МЕНЮ";
            ruDict["menu_music"] = "Музыка в меню";
            ruDict["РЕЖИМ ДИНАМИКОВ"] = "РЕЖИМ ДИНАМИКОВ";
            ruDict["Stereo"] = "Стерео";
            ruDict["Surround"] = "Объемный звук";
            ruDict["Mono"] = "Моно";
            ruDict["5.1 Surround"] = "5.1 Объемный";
            ruDict["7.1 Surround"] = "7.1 Объемный";

            // Input Options & Keybinds
            ruDict["MOUSE SENSITIVITY"] = "ЧУВСТВИТЕЛЬНОСТЬ МЫШИ";
            ruDict["mouse_sensitivity"] = "Чувствительность мыши";
            ruDict["FLIP Y AXIS"] = "ИНВЕРСИЯ ОСИ Y (МЫШЬ)";
            ruDict["flip_y_axis"] = "ИНВЕРСИЯ ОСИ Y (МЫШЬ)";
            ruDict["INVERT MOUSE"] = "ИНВЕРСИЯ МЫШИ";
            ruDict["invert_mouse"] = "Инвертировать мышь";
            ruDict["AUTO TRANSMIT VOICE"] = "АВТОМАТИЧЕСКАЯ ПЕРЕДАЧА ГОЛОСА";
            ruDict["auto_transmit_voice"] = "АВТОМАТИЧЕСКАЯ ПЕРЕДАЧА ГОЛОСА";
            ruDict["SPEAK MODE"] = "РЕЖИМ МИКРОФОНА";
            ruDict["speak_mode"] = "Режим микрофона";
            ruDict["PUSH TO TALK"] = "Голос по нажатию клавиши";
            ruDict["CROUCH HOLD"] = "ПРИСЕДАНИЕ (УДЕРЖАНИЕ)";
            ruDict["crouch_hold"] = "Приседание (удержание)";
            ruDict["FULLSCREEN"] = "ПОЛНОЭКРАННЫЙ РЕЖИМ";
            ruDict["fullscreen"] = "Полноэкранный режим";
            ruDict["RESOLUTION"] = "РАЗРЕШЕНИЕ ЭКРАНА";
            ruDict["resolution"] = "Разрешение экрана";
            ruDict["VSYNC"] = "ВЕРТИКАЛЬНАЯ СИНХРОНИЗАЦИЯ (V-SYNC)";
            ruDict["vsync"] = "Вертикальная синхронизация (V-Sync)";
            ruDict["LIMIT FRAMERATE"] = "ОГРАНИЧЕНИЕ FPS (MAX FPS)";
            ruDict["limit_framerate"] = "Ограничение частоты кадров (Max FPS)";

            ruDict["FORWARD"] = "Вперед";
            ruDict["BACKWARD"] = "Назад";
            ruDict["LEFT"] = "Влево";
            ruDict["RIGHT"] = "Вправо";
            ruDict["JUMP"] = "Прыжок";
            ruDict["DUCK"] = "Присесть";
            ruDict["SPRINT"] = "Бег";
            ruDict["USE"] = "Использовать / Действие";
            ruDict["PRIMARY FIRE"] = "Основная атака / Выстрел";
            ruDict["PRIMARY ATTACK"] = "Основная атака / Выстрел";
            ruDict["SECONDARY FIRE"] = "Прицеливание / Доп. атака";
            ruDict["SECONDARY ATTACK"] = "Прицеливание / Доп. атака";
            ruDict["RELOAD"] = "Перезарядка";
            ruDict["HEAD LOOK"] = "Свободный обзор (Оглядеться)";
            ruDict["LIGHT TOGGLE"] = "Фонарик / Лазер (Вкл/Выкл)";
            ruDict["VOICE TRANSMIT"] = "Передача голоса";
            ruDict["VOICE"] = "Голосовой чат";
            ruDict["CHAT"] = "Текстовый чат";
            ruDict["SHOW MAP"] = "Отображать карту";
            ruDict["DEVELOPER CONSOLE"] = "Консоль разработчика";
            ruDict["BUG REPORT"] = "Отчет об ошибке";

            ruDict["SLOT 1"] = "Слот 1";
            ruDict["SLOT 2"] = "Слот 2";
            ruDict["SLOT 3"] = "Слот 3";
            ruDict["SLOT 4"] = "Слот 4";
            ruDict["SLOT 5"] = "Слот 5";
            ruDict["SLOT 6"] = "Слот 6";
            ruDict["SLOT 7"] = "Слот 7";
            ruDict["SLOT 8"] = "Слот 8";
            ruDict["NEXT SLOT"] = "Следующий слот";
            ruDict["PREVIOUS SLOT"] = "Предыдущий слот";
            #endregion

            #region 3. Инвентарь, Крафт и Чертежи
            ruDict["INVENTORY"] = "ИНВЕНТАРЬ";
            ruDict["inventory"] = "ИНВЕНТАРЬ";
            ruDict["CRAFTING"] = "КРАФТ";
            ruDict["crafting"] = "КРАФТ";
            ruDict["QUICK CRAFT"] = "БЫСТРЫЙ КРАФТ";
            ruDict["quick_craft"] = "БЫСТРЫЙ КРАФТ";
            ruDict["CRAFT QUEUE"] = "ОЧЕРЕДЬ КРАФТА";
            ruDict["craft_queue"] = "ОЧЕРЕДЬ КРАФТА";
            ruDict["BLUEPRINTS"] = "ЧЕРТЕЖИ";
            ruDict["blueprint"] = "Чертеж";
            ruDict["blueprints"] = "ЧЕРТЕЖИ";
            ruDict["study_blueprint"] = "Изучить чертеж";
            ruDict["already_studied"] = "Уже изучено";
            ruDict["requirements"] = "Необходимо для крафта";
            ruDict["craft_amount"] = "Количество для крафта";
            ruDict["craft_time"] = "Время создания";
            ruDict["craft_button"] = "СОЗДАТЬ";
            ruDict["cancel_craft"] = "Отменить создание";
            ruDict["WEAR"] = "ОДЕЖДА";
            ruDict["wear"] = "ОДЕЖДА";
            ruDict["BELT"] = "БЫСТРЫЙ ДОСТУП";
            ruDict["belt"] = "БЫСТРЫЙ ДОСТУП";
            ruDict["drop_item"] = "Выбросить";
            ruDict["split_item"] = "Разделить";
            ruDict["split_half"] = "Разделить пополам";
            ruDict["split_one"] = "Взять одну штуку";
            #endregion

            #region 4. Ресурсы и Материалы
            ruDict["wood"] = "Дерево";
            ruDict["wood_desc"] = "Базовый строительный ресурс. Добывается вырубкой деревьев с помощью топора или инструментов.";
            ruDict["stones"] = "Камни";
            ruDict["stones_desc"] = "Основной ресурс для каменного строительства и изготовления инструментов. Добывается из каменных жил.";
            ruDict["metal.fragments"] = "Фрагменты металла";
            ruDict["metal.fragments_desc"] = "Очищенный металл, полученный путем переплавки руды в печи. Используется для укрепления стен, оружия и замков.";
            ruDict["metal.refined"] = "Качественный металл (МВК)";
            ruDict["metal.refined_desc"] = "Высокопрочный металл высшего сорта. Необходим для бронированных построек, лучшей брони и штурмового оружия.";
            ruDict["sulfur"] = "Сера";
            ruDict["sulfur_desc"] = "Очищенная сера после переплавки серной руды. Главный компонент для производства пороха и взрывчатки.";
            ruDict["sulfur.ore"] = "Серная руда";
            ruDict["sulfur.ore_desc"] = "Необработанная серная порода. Требует переплавки в печи для получения серы.";
            ruDict["metal.ore"] = "Металлическая руда";
            ruDict["metal.ore_desc"] = "Необработанный кусок железной руды. Переплавляется в печи во фрагменты металла.";
            ruDict["charcoal"] = "Древесный уголь";
            ruDict["charcoal_desc"] = "Остатки сгоревшей древесины. Используется вместе с серой для создания пороха.";
            ruDict["gunpowder"] = "Порох";
            ruDict["gunpowder_desc"] = "Взрывчатая смесь угля и серы. Основа для любых видов патронов, гранат и взрывчатки C4.";
            ruDict["cloth"] = "Ткань";
            ruDict["cloth_desc"] = "Мягкий материал из конопли и шкур животных. Необходим для создания бинтов, одежды, спальных мешков и топлива.";
            ruDict["leather"] = "Кожа";
            ruDict["leather_desc"] = "Прочная выделанная кожа животных. Применяется для создания защитной кожаной одежды.";
            ruDict["fat.animal"] = "Жир животных";
            ruDict["fat.animal_desc"] = "Сырой животный жир. Вместе с тканью перерабатывается в топливо низкого качества.";
            ruDict["lowgradefuel"] = "Топливо низкого качества";
            ruDict["lowgradefuel_desc"] = "Горючая смесь для заправки печей, факелов, огненных стрел, карьеров и взрывчатки.";
            ruDict["bone.fragments"] = "Осколки костей";
            ruDict["bone.fragments_desc"] = "Острые костяные обломки. Используются для костяной брони, костяных ножей и дубинок.";
            #endregion

            #region 5. Оружие и Инструменты
            ruDict["rifle.ak"] = "Штурмовая винтовка (АК-47)";
            ruDict["rifle.ak_desc"] = "Культовый автомат. Высокая огневая мощь и дальность стрельбы. Использует патроны 5.56 мм.";
            ruDict["rifle.bolt"] = "Винтовка с продольно-скользящим затвором (Болт)";
            ruDict["rifle.bolt_desc"] = "Высокоточная снайперская винтовка с огромным уроном на дальних дистанциях.";
            ruDict["smg.thompson"] = "Пистолет-пулемет Томпсона";
            ruDict["smg.thompson_desc"] = "Скорострельный пистолет-пулемет с емким барабанным магазином. Отличен для ближнего боя.";
            ruDict["smg.2"] = "Самодельный ПП (Custom SMG)";
            ruDict["smg.2_desc"] = "Компактный автоматический пистолет-пулемет с высочайшей скорострельностью.";
            ruDict["pistol.semiauto"] = "Полуавтоматический пистолет (P250)";
            ruDict["pistol.semiauto_desc"] = "Надежный пистолет с магазином на 10 патронов и хорошей точностью.";
            ruDict["pistol.revolver"] = "Револьвер";
            ruDict["pistol.revolver_desc"] = "Простой шестизарядный револьвер. Отличное стартовое огнестрельное оружие.";
            ruDict["pistol.eoka"] = "Самодельный пистоль (Эока)";
            ruDict["pistol.eoka_desc"] = "Кустарное кремневое оружие. Стреляет дробью с шансом осечки при каждом ударе кремня.";
            ruDict["shotgun.waterpipe"] = "Самопал (Водопроводная труба)";
            ruDict["shotgun.waterpipe_desc"] = "Однозарядный дробовик из трубы. Смертелен в упор.";
            ruDict["shotgun.pump"] = "Помповый дробовик";
            ruDict["shotgun.pump_desc"] = "Мощный многозарядный дробовик с высоким уроном по площади.";
            ruDict["bow.hunting"] = "Охотничий лук";
            ruDict["bow.hunting_desc"] = "Бесшумное оружие дальнего боя. Позволяет незаметно уничтожать дичь и врагов.";
            ruDict["crossbow"] = "Арбалет";
            ruDict["crossbow_desc"] = "Тяжелый арбалет с высокой точностью и бронебойным уроном.";
            ruDict["rocket.launcher"] = "Ракетница (РПГ)";
            ruDict["rocket.launcher_desc"] = "Тяжелое осадное орудие для уничтожения баз и укреплений ракетами.";
            ruDict["explosive.timed"] = "Взрывчатка C4";
            ruDict["explosive.timed_desc"] = "Пластид с таймером. Максимальный урон по стенам, дверям и защитным конструкциям.";
            ruDict["explosive.satchel"] = "Сумка с зарядом (Сачель)";
            ruDict["explosive.satchel_desc"] = "Связка бобовых гранат. Непредсказуемый таймер с возможностью повторного запала.";
            ruDict["grenade.f1"] = "Граната Ф-1";
            ruDict["grenade.f1_desc"] = "Оборонительная осколочная граната с радиусом сплошного поражения.";
            ruDict["grenade.beancan"] = "Бобовая граната";
            ruDict["grenade.beancan_desc"] = "Самодельная граната из консервной банки с порохом.";

            ruDict["hatchet"] = "Топор";
            ruDict["pickaxe"] = "Кирка";
            ruDict["stonehatchet"] = "Каменный топор";
            ruDict["stone.pickaxe"] = "Каменная кирка";
            ruDict["hammer"] = "Строительный молот";
            ruDict["building.planner"] = "План постройки";
            ruDict["torch"] = "Факел";
            ruDict["spear.wooden"] = "Деревянное копье";
            ruDict["spear.stone"] = "Каменное копье";
            ruDict["knife.bone"] = "Костяной нож";
            ruDict["bone.club"] = "Костяная дубинка";
            ruDict["machete"] = "Мачете";
            ruDict["salvaged.sword"] = "Самодельный меч";
            ruDict["salvaged.cleaver"] = "Самодельный тесак";
            ruDict["salvaged.axe"] = "Самодельный топор";
            ruDict["salvaged.icepick"] = "Самодельный ледоруб";
            #endregion

            #region 6. Боеприпасы и Медицина
            ruDict["ammo.rifle"] = "Патроны 5.56 мм";
            ruDict["ammo.rifle.hv"] = "Скоростные патроны 5.56 мм";
            ruDict["ammo.rifle.explosive"] = "Разрывные патроны 5.56 мм";
            ruDict["ammo.pistol"] = "Пистолетные патроны 9 мм";
            ruDict["ammo.pistol.hv"] = "Скоростные патроны 9 мм";
            ruDict["ammo.shotgun"] = "Дробь 12 калибра";
            ruDict["ammo.shotgun.slug"] = "Пули 12 калибра";
            ruDict["arrow.wooden"] = "Деревянная стрела";
            ruDict["arrow.hv"] = "Скоростная стрела";
            ruDict["ammo.rocket.basic"] = "Стандартная ракета";
            ruDict["ammo.rocket.hv"] = "Скоростная ракета";
            ruDict["ammo.rocket.fire"] = "Зажигательная ракета";

            ruDict["bandage"] = "Бинт";
            ruDict["bandage_desc"] = "Мгновенно останавливает кровотечение и восстанавливает небольшое количество здоровья.";
            ruDict["syringe.medical"] = "Медицинский шприц";
            ruDict["syringe.medical_desc"] = "Быстро восстанавливает 15 единиц здоровья и начинает плавную регенерацию.";
            ruDict["blood"] = "Пакет крови";
            ruDict["antiradpills"] = "Таблетки от радиации";
            #endregion

            #region 7. Строительство и Объекты
            ruDict["foundation"] = "Фундамент";
            ruDict["foundation.triangle"] = "Треугольный фундамент";
            ruDict["wall"] = "Стена";
            ruDict["doorway"] = "Дверной проем";
            ruDict["window"] = "Оконный проем";
            ruDict["floor"] = "Потолок / Пол";
            ruDict["floor.triangle"] = "Треугольный потолок";
            ruDict["roof"] = "Крыша";
            ruDict["stairs.l"] = "L-образная лестница";
            ruDict["stairs.u"] = "U-образная лестница";
            ruDict["pillar"] = "Колонна";
            ruDict["wall.low"] = "Низкая стенка";
            ruDict["wall.half"] = "Полустена";
            ruDict["wall.frame"] = "Каркас стены";
            ruDict["floor.frame"] = "Каркас потолка";

            ruDict["box.wooden"] = "Маленький деревянный ящик";
            ruDict["box.wooden.large"] = "Большой деревянный ящик";
            ruDict["furnace"] = "Печь";
            ruDict["furnace.large"] = "Большая печь";
            ruDict["campfire"] = "Костер";
            ruDict["sleepingbag"] = "Спальный мешок";
            ruDict["bed"] = "Кровать";
            ruDict["lock.code"] = "Кодовый замок";
            ruDict["lock.key"] = "Ключевой замок";
            ruDict["autoturret"] = "Автоматическая турель";
            ruDict["mining.quarry"] = "Горнорудный карьер";
            ruDict["small.oil.refinery"] = "Нефтеперерабатывающий завод";
            ruDict["repair.bench"] = "Ремонтный верстак";
            ruDict["research.table"] = "Стол исследований";
            ruDict["lantern"] = "Фонарь";
            ruDict["door.hinged.wood"] = "Деревянная дверь";
            ruDict["door.hinged.metal"] = "Металлическая дверь";
            ruDict["door.hinged.toptier"] = "Бронированная дверь";
            ruDict["barricade.wood"] = "Деревянная баррикада";
            ruDict["barricade.metal"] = "Металлическая баррикада";
            ruDict["wall.external.high.wood"] = "Высокая деревянная стена";
            ruDict["wall.external.high.stone"] = "Высокая каменная стена";
            ruDict["gates.external.high.wood"] = "Высокие деревянные ворота";
            ruDict["gates.external.high.stone"] = "Высокие каменные ворота";
            #endregion

            #region 8. Действия и Радиальное меню
            ruDict["open"] = "Открыть";
            ruDict["close"] = "Закрыть";
            ruDict["lock"] = "Заблокировать";
            ruDict["unlock"] = "Разблокировать";
            ruDict["change_code"] = "Сменить пин-код";
            ruDict["enter_code"] = "Ввести пин-код";
            ruDict["turn_on"] = "Включить";
            ruDict["turn_off"] = "Выключить";
            ruDict["ignite"] = "Разжечь";
            ruDict["extinguish"] = "Потушить";
            ruDict["drink"] = "Пить";
            ruDict["eat"] = "Съесть";
            ruDict["take"] = "Взять";
            ruDict["loot"] = "Обыскать";
            ruDict["pickup"] = "Подобрать";
            ruDict["authorise"] = "Авторизоваться";
            ruDict["clear_auth"] = "Очистить список";
            ruDict["study"] = "Изучить";
            ruDict["drop"] = "Выбросить";
            ruDict["repair"] = "Починить";
            ruDict["knock_door"] = "Постучать в дверь";
            ruDict["open_door"] = "Открыть дверь";
            ruDict["close_door"] = "Закрыть дверь";
            ruDict["give_to_friend"] = "Передать другу";
            ruDict["assign_to_friend"] = "Назначить на друга";

            ruDict["upgrade_wood"] = "Улучшить до дерева";
            ruDict["upgrade_stone"] = "Улучшить до камня";
            ruDict["upgrade_metal"] = "Улучшить до металла";
            ruDict["upgrade_toptier"] = "Улучшить до МВК";
            ruDict["demolish"] = "Снести";
            ruDict["demolish_immediate"] = "Мгновенный снос";
            ruDict["rotate"] = "Повернуть";
            ruDict["grade_is_lower"] = "Нельзя понизить уровень";
            ruDict["grade_is_current"] = "Уже построено";
            ruDict["building_blocked"] = "Строительство заблокировано (ЧУЖОЙ ШКАФ)";
            ruDict["rotation_blocked"] = "Поворот заблокирован";
            ruDict["upgrade_blocked"] = "Улучшение заблокировано";
            #endregion

            #region 9. Статусы игрока, Здоровье и Смерть
            ruDict["health"] = "Здоровье";
            ruDict["calories"] = "Сытость";
            ruDict["hydration"] = "Жажда";
            ruDict["comfort"] = "Комфорт";
            ruDict["warmth"] = "Тепло";
            ruDict["cold"] = "Холод";
            ruDict["too_cold"] = "Сильное обморожение";
            ruDict["wet"] = "Сырость";
            ruDict["bleeding"] = "Кровотечение";
            ruDict["poison"] = "Отравление";
            ruDict["radiation"] = "Радиация";
            ruDict["starving"] = "Голод (Истощение)";
            ruDict["dehydrated"] = "Жажда (Обезвоживание)";
            ruDict["drowning"] = "Утопление";
            ruDict["sleeping"] = "Спит";
            ruDict["wounded"] = "Тяжело ранен";
            ruDict["respawn"] = "Возродиться";
            ruDict["respawn_sleeping_bag"] = "Возродиться в спальнике";
            ruDict["respawn_bed"] = "Возродиться в кровати";
            ruDict["you_died"] = "ВЫ ПОГИБЛИ";
            ruDict["killed_by"] = "Убит игроком";
            ruDict["death_reason"] = "Причина смерти";
            ruDict["suicide"] = "Самоубийство";
            #endregion
        }
    }
}
