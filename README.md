# 🛸 RustPilot — Панель Управления и Оркестрации Серверов Rust

<p align="center">
  <img src="public/icon_fp_256.png" width="128" height="128" alt="RustPilot Logo" />
</p>

<p align="center">
  <b>Современная автономная панель управления серверами Rust Dedicated Server с поддержкой Vanilla, Oxide/uMod, Carbon и исторических Devblog версий.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Release-v1.0.0-00f0ff.svg" alt="Release" />
  <img src="https://img.shields.io/badge/Electron-34-2563eb.svg" alt="Electron" />
  <img src="https://img.shields.io/badge/React-19-10b981.svg" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Team-TRP%20Labs-f59e0b.svg" alt="Team Rust Plugins" />
</p>

---

## ⚡ Ключевые Возможности

- 🚀 **1-Click Установка и Запуск**: Автоматическая загрузка серверов через SteamCMD и запуск в изолированных инстансах.
- ☁️ **Интеграция с Google Drive**: Полная поддержка 26 исторических версий Rust Devblog (от Devblog 65 до Devblog 301) без Steam и без DepotDownloader.
- 📊 **Живая Телеметрия и Графика**: Частота кадров (FPS), ОЗУ, ЦП, количество сущностей (Entities), входящий/исходящий трафик и концентрические световые маяки на SVG-графиках.
- 🖵 **Индустриальная RCON-Консоль**: Высокопроизводительный терминал с автоскроллом, историей команд, подсветкой синтаксиса и фильтром винтажного ЭЛТ-монитора (CRT Scanlines).
- 👥 **Мониторинг Игроков**: Список игроков онлайн со Steam-аватарами, цветными кольцами пинга (<50ms, <120ms, >120ms), киком, баном и инвентарем.
- 🔌 **Каталог Плагинов**: 1-Click установка популярных плагинов для Oxide/uMod и Carbon.
- 🔊 **Тактильный Web Audio API Звук**: Процедурный синтез звуков клика, раскрутки реактора при старте и завершении работы (0 Кб аудиофайлов).
- 🔄 **Прямое In-App Авто-Обновление**: Автоматическая проверка обновлений на GitHub и бесшовное обновление приложения прямо внутри интерфейса без браузера.

---

## 🚀 Быстрый Старт

1. Скачайте архив релиза **`RustPilot-v1.0.0-win-x64.zip`** со страницы [Releases](https://github.com/Lolkek1337123/RustPilot/releases).
2. Распакуйте архив в удобное место на диске.
3. Запустите **`Start_RustPilot.bat`** (или `RustPilot.exe`).

---

## 🛠️ Разработка и Сборка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка исполняемого приложения
npm run build:exe

# Сборка и подготовка релиза для GitHub
npm run release:pack
```

---

## 👨‍💻 Разработчик

Разработано командой **TRP Labs (TEAM_RUST_PLUGINS)** © 2026. Все права защищены.
