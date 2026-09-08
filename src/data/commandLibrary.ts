export interface CommandCategory {
  title: string;
  color: string;
  items: { cmd: string; ru: string; en: string; params?: string }[];
}

export const getCommandCatalog = (framework: string): CommandCategory[] => {
  const isCarbon = framework.toLowerCase().includes('carbon');
  const isOxide = framework.toLowerCase().includes('oxide');

  const categories: CommandCategory[] = [
    {
      title: '01. ОСНОВНЫЕ КОМАНДЫ ДВИЖКА (Vanilla Core)',
      color: 'blue',
      items: [
        { cmd: 'status', ru: 'Вывести текущий статус сервера и онлайн', en: 'Print server status and online players' },
        { cmd: 'serverinfo', ru: 'JSON информация о производительности и FPS', en: 'Server telemetry and performance' },
        { cmd: 'fps', ru: 'Текущий тикрейт (FPS) сервера', en: 'Current server framerate' },
        { cmd: 'server.save', ru: 'Принудительное сохранение карты и мира', en: 'Force save the world map' },
        { cmd: 'server.writecfg', ru: 'Записать конфигурации в server.cfg', en: 'Write configs to disk' },
        { cmd: 'gc.collect', ru: 'Принудительная сборка мусора Mono / GC', en: 'Force garbage collection' },
        { cmd: 'global.restart', ru: 'Перезагрузка сервера с таймером', en: 'Restart with timer', params: '<seconds>' },
        { cmd: 'global.kickall', ru: 'Кикнуть всех игроков с сервера', en: 'Kick all players' },
        { cmd: 'global.banlist', ru: 'Список забаненных пользователей', en: 'Banned users list' },
        { cmd: 'global.say', ru: 'Отправить системное сообщение в чат', en: 'Broadcast message to chat', params: '<text>' },
        { cmd: 'global.teleport', ru: 'Телепортировать игрока к игроку', en: 'Teleport player to target', params: '<player> <target>' },
        { cmd: 'inventory.give', ru: 'Выдать предмет игроку в инвентарь', en: 'Give item to player', params: '<item> <amount>' },
        { cmd: 'heli.call', ru: 'Вызвать патрульный вертолет Patrol Heli', en: 'Call patrol helicopter' },
        { cmd: 'cargoship.call', ru: 'Вызвать грузовой корабль Cargo Ship', en: 'Call cargo ship event' }
      ]
    }
  ];

  if (isCarbon) {
    categories.push({
      title: '02. CARBON FRAMEWORK COMMANDS',
      color: 'rose',
      items: [
        { cmd: 'c.load', ru: 'Загрузить плагины (* для загрузки всех)', en: 'Load plugins (* for all)', params: '<name|*>' },
        { cmd: 'c.unload', ru: 'Выгрузить плагины из памяти', en: 'Unload plugins', params: '<name|*>' },
        { cmd: 'c.reload', ru: 'Горячая перезагрузка плагина', en: 'Hot-reload plugin', params: '<name|*>' },
        { cmd: 'c.version', ru: 'Показать версию Carbon и компилятора', en: 'Show Carbon and compiler version' },
        { cmd: 'c.plugins', ru: 'Список установленных плагинов Carbon', en: 'List all Carbon plugins' },
        { cmd: 'c.grant', ru: 'Выдать пермишен игроку или группе', en: 'Grant permission', params: '<user|group> <name> <perm>' },
        { cmd: 'c.revoke', ru: 'Отобрать пермишен у игрока/группы', en: 'Revoke permission', params: '<user|group> <name> <perm>' },
        { cmd: 'c.group', ru: 'Управление группами привилегий', en: 'Group management', params: '<add|remove|set> <group>' },
        { cmd: 'c.usergroup', ru: 'Добавить игрока в группу', en: 'Add user to group', params: '<add|remove> <user> <group>' },
        { cmd: 'c.editconfig', ru: 'Открыть редактор конфигурации плагина', en: 'Open plugin config editor', params: '<plugin>' },
        { cmd: 'c.reloadconfig', ru: 'Перезагрузить конфиг плагина с диска', en: 'Reload plugin config from disk', params: '<plugin>' },
        { cmd: 'c.createplugin', ru: 'Сгенерировать шаблон нового плагина', en: 'Create new C# plugin template', params: '<name>' },
        { cmd: 'c.aliases', ru: 'Список всех алиасов команд', en: 'List all command aliases' },
        { cmd: 'c.assignalias', ru: 'Назначить собственный алиас команде', en: 'Assign custom alias', params: '<alias> <command>' },
        { cmd: 'c.build', ru: 'Подробная информация о сборке Carbon', en: 'Carbon detailed build info' },
        { cmd: 'c.hooks', ru: 'Мониторинг активных хуков плагинов', en: 'Active hooks inspection' },
        { cmd: 'c.profile', ru: 'Включить/выключить профилирование Mono', en: 'Toggle Mono performance profiling' },
        { cmd: 'c.whymodded', ru: 'Анализ причин статуса Modded в браузере', en: 'Why modded server status analysis' }
      ]
    });
  } else if (isOxide) {
    categories.push({
      title: '02. OXIDE / UMOD FRAMEWORK COMMANDS',
      color: 'amber',
      items: [
        { cmd: 'oxide.load', ru: 'Загрузить плагин (* для всех)', en: 'Load plugin', params: '<name|*>' },
        { cmd: 'oxide.unload', ru: 'Выгрузить плагин из памяти', en: 'Unload plugin', params: '<name|*>' },
        { cmd: 'oxide.reload', ru: 'Перезагрузить плагин', en: 'Reload plugin', params: '<name|*>' },
        { cmd: 'oxide.version', ru: 'Показать версию Oxide', en: 'Show Oxide version' },
        { cmd: 'oxide.plugins', ru: 'Список загруженных плагинов Oxide', en: 'List all loaded Oxide plugins' },
        { cmd: 'oxide.show groups', ru: 'Список существующих групп прав', en: 'Show permission groups' },
        { cmd: 'oxide.show perms', ru: 'Список зарегистрированных прав на сервере', en: 'Show all registered perms' },
        { cmd: 'oxide.grant', ru: 'Выдать право игроку (user) или группе (group)', en: 'Grant perm to user or group', params: '<user|group> <target> <perm>' },
        { cmd: 'oxide.revoke', ru: 'Забрать право у игрока/группы', en: 'Revoke perm', params: '<user|group> <target> <perm>' },
        { cmd: 'oxide.group add', ru: 'Создать новую группу прав', en: 'Create new group', params: '<name>' },
        { cmd: 'oxide.usergroup add', ru: 'Добавить игрока в группу', en: 'Add user to group', params: '<player> <group>' }
      ]
    });
  }

  categories.push({
    title: '03. ПЕРЕМЕННЫЕ СЕРВЕРА (ConVars & Настройки)',
    color: 'emerald',
    items: [
      { cmd: 'fps.limit', ru: 'Ограничение максимального FPS сервера', en: 'FPS limit', params: '<number>' },
      { cmd: 'server.maxplayers', ru: 'Максимальный лимит слотов игроков', en: 'Max player slots', params: '<number>' },
      { cmd: 'server.saveinterval', ru: 'Интервал автосохранения в секундах', en: 'Autosave interval in seconds', params: '<seconds>' },
      { cmd: 'decay.scale', ru: 'Множитель скорости гниения построек (1 = 100%, 0 = выкл)', en: 'Decay speed scale', params: '<float>' },
      { cmd: 'craft.instant', ru: 'Мгновенный крафт предметов (true/false)', en: 'Instant crafting switch', params: '<true|false>' },
      { cmd: 'antihack.enabled', ru: 'Включить/выключить встроенный антихак Facepunch', en: 'Native antihack toggle', params: '<0|1>' },
      { cmd: 'ai.think', ru: 'Включить/выключить искусственный интеллект NPC/животных', en: 'AI thinking toggle', params: '<true|false>' },
      { cmd: 'env.time', ru: 'Установить внутриигровое время суток (0-24)', en: 'Set in-game time of day', params: '<0-24>' },
      { cmd: 'weather.clouds', ru: 'Плотность облаков в погоде (0-1)', en: 'Cloud density (0 to 1)', params: '<0-1>' },
      { cmd: 'weather.fog', ru: 'Плотность тумана (0-1)', en: 'Fog density (0 to 1)', params: '<0-1>' },
      { cmd: 'weather.rain', ru: 'Интенсивность дождя (0-1)', en: 'Rain intensity (0 to 1)', params: '<0-1>' }
    ]
  });

  return categories;
};
