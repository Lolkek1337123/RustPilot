import fs from 'fs';
import path from 'path';
import https from 'https';

export interface StorePlugin {
  id: string;
  name: string;
  category: 'admin' | 'economy' | 'clans' | 'rates' | 'protection' | 'utility';
  author: string;
  version: string;
  description: string;
  downloadUrl?: string;
  codeContent?: string;
  tags: string[];
  downloadsCount: number;
}

export class PluginStoreService {
  private catalog: StorePlugin[] = [
    {
      id: 'NConsole',
      name: 'NConsole',
      category: 'admin',
      author: 'TEAM_RUST_PLUGINS',
      version: '1.2.4',
      description: 'Улучшенная нативная консоль и перехватчик логов с подсветкой и автодополнением.',
      tags: ['Admin', 'Console', 'Tools'],
      downloadsCount: 14200,
      codeContent: `using System;\nusing Oxide.Core.Plugins;\n\nnamespace Oxide.Plugins\n{\n    [Info("NConsole", "TEAM_RUST_PLUGINS", "1.2.4")]\n    [Description("Enhanced server console logger and highlighter.")]\n    public class NConsole : RustPlugin\n    {\n        void Loaded()\n        {\n            Puts("NConsole by TEAM_RUST_PLUGINS initialized successfully.");\n        }\n    }\n}`
    },
    {
      id: 'Kits',
      name: 'Kits (Наборы предметов)',
      category: 'economy',
      author: 'k1lly0u / Carbon',
      version: '4.0.12',
      description: 'Создание и выдача наборов экипировки (Стартовые киты, VIP, Бонусы) с кулдаунами и GUI.',
      tags: ['Kits', 'GUI', 'Economy'],
      downloadsCount: 89300,
      codeContent: `using System;\nusing Oxide.Core.Plugins;\n\nnamespace Oxide.Plugins\n{\n    [Info("Kits", "k1lly0u", "4.0.12")]\n    [Description("Create and manage equipment kits with GUI.")]\n    public class Kits : RustPlugin\n    {\n        void Loaded() { Puts("Kits plugin ready."); }\n        [ChatCommand("kit")]\n        void cmdKit(BasePlayer player) { SendReply(player, "<color=#ff3344>[KITS]</color> Открытие меню наборов..."); }\n    }\n}`
    },
    {
      id: 'ClanSystem',
      name: 'ClanSystem (Кланы и Альянсы)',
      category: 'clans',
      author: 'TEAM_RUST_PLUGINS',
      version: '2.5.0',
      description: 'Полнофункциональная система кланов, тегов в чате, общий сундук, союзники и клановый радар.',
      tags: ['Clans', 'Teams', 'Chat'],
      downloadsCount: 45200,
      codeContent: `using System;\nusing Oxide.Core.Plugins;\n\nnamespace Oxide.Plugins\n{\n    [Info("ClanSystem", "TEAM_RUST_PLUGINS", "2.5.0")]\n    [Description("Full featured clan and alliance management.")]\n    public class ClanSystem : RustPlugin\n    {\n        void Loaded() { Puts("ClanSystem initialized."); }\n    }\n}`
    },
    {
      id: 'BGrade',
      name: 'BGrade (Авто-апгрейд построек)',
      category: 'utility',
      author: 'Ryan',
      version: '1.1.8',
      description: 'Автоматическое улучшение деревянных/каменных/металлических стен и полов при установке строительным планом.',
      tags: ['Building', 'Automation', 'QoL'],
      downloadsCount: 112000,
      codeContent: `using System;\nusing Oxide.Core.Plugins;\n\nnamespace Oxide.Plugins\n{\n    [Info("BGrade", "Ryan", "1.1.8")]\n    [Description("Auto grade building blocks on placement.")]\n    public class BGrade : RustPlugin\n    {\n        void Loaded() { Puts("BGrade ready."); }\n    }\n}`
    },
    {
      id: 'GatherManager',
      name: 'GatherManager (Рейты добычи)',
      category: 'rates',
      author: 'Mughisi',
      version: '2.2.75',
      description: 'Гибкая настройка рейтов добычи дерева, руды, карьеров, дропа с бочек и животных (2x, 3x, 5x, 10x).',
      tags: ['Rates', 'Loot', 'Gather'],
      downloadsCount: 97500,
      codeContent: `using System;\nusing Oxide.Core.Plugins;\n\nnamespace Oxide.Plugins\n{\n    [Info("GatherManager", "Mughisi", "2.2.75")]\n    [Description("Manage gather rates across resources.")]\n    public class GatherManager : RustPlugin\n    {\n        void Loaded() { Puts("GatherManager 2x/3x/5x operational."); }\n    }\n}`
    },
    {
      id: 'RemoverTool',
      name: 'RemoverTool (Удаление построек)',
      category: 'protection',
      author: 'Reneb / Fuchs',
      version: '4.3.3',
      description: 'Позволяет игрокам удалять свои ошибочно установленные постройки командой /remove с возвратом ресурсов.',
      tags: ['Building', 'Remove', 'Refund'],
      downloadsCount: 78900,
      codeContent: `using System;\nusing Oxide.Core.Plugins;\n\nnamespace Oxide.Plugins\n{\n    [Info("RemoverTool", "Reneb", "4.3.3")]\n    [Description("Building remover tool with refund.")]\n    public class RemoverTool : RustPlugin\n    {\n        void Loaded() { Puts("RemoverTool loaded."); }\n    }\n}`
    },
    {
      id: 'Economics',
      name: 'Economics (Внутриигровая валюта)',
      category: 'economy',
      author: 'Wulf',
      version: '3.8.4',
      description: 'Основная база данных внутриигровой валюты и балансов игроков для магазинов и наград.',
      tags: ['Economy', 'Currency', 'Core'],
      downloadsCount: 65400,
      codeContent: `using System;\nusing Oxide.Core.Plugins;\n\nnamespace Oxide.Plugins\n{\n    [Info("Economics", "Wulf", "3.8.4")]\n    [Description("Player balance and currency framework.")]\n    public class Economics : RustPlugin\n    {\n        void Loaded() { Puts("Economics database online."); }\n    }\n}`
    },
    {
      id: 'AutoCodeLock',
      name: 'AutoCodeLock (Авто-замки)',
      category: 'utility',
      author: 'TEAM_RUST_PLUGINS',
      version: '1.4.0',
      description: 'Автоматическая установка и ввод пароля замка при размещении дверей, сундуков и турелей.',
      tags: ['Security', 'QoL', 'Doors'],
      downloadsCount: 51200,
      codeContent: `using System;\nusing Oxide.Core.Plugins;\n\nnamespace Oxide.Plugins\n{\n    [Info("AutoCodeLock", "TEAM_RUST_PLUGINS", "1.4.0")]\n    [Description("Auto place and pin codelocks.")]\n    public class AutoCodeLock : RustPlugin\n    {\n        void Loaded() { Puts("AutoCodeLock ready."); }\n    }\n}`
    }
  ];

  public getCatalog(): StorePlugin[] {
    return this.catalog;
  }

  public getInstalledPlugins(serverDir: string, framework: string): { name: string; isInstalled: boolean }[] {
    const isCarbon = framework.startsWith('carbon');
    const pluginsDir = path.join(serverDir, isCarbon ? 'carbon' : 'oxide', 'plugins');

    if (!fs.existsSync(pluginsDir)) {
      return [];
    }

    const files = fs.readdirSync(pluginsDir);
    return this.catalog.map((plugin) => ({
      name: plugin.id,
      isInstalled: files.some((f) => f.toLowerCase() === `${plugin.id.toLowerCase()}.cs`)
    }));
  }

  public installPlugin(serverDir: string, framework: string, pluginId: string): { success: boolean; message: string } {
    const plugin = this.catalog.find((p) => p.id === pluginId);
    if (!plugin) {
      return { success: false, message: `Плагин с ID ${pluginId} не найден в каталоге.` };
    }

    const isCarbon = framework.startsWith('carbon');
    const pluginsDir = path.join(serverDir, isCarbon ? 'carbon' : 'oxide', 'plugins');

    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
    }

    const targetFile = path.join(pluginsDir, `${plugin.id}.cs`);
    const content = plugin.codeContent || `// ${plugin.name} v${plugin.version}\nusing Oxide.Core.Plugins;\nnamespace Oxide.Plugins { [Info("${plugin.id}", "${plugin.author}", "${plugin.version}")] public class ${plugin.id} : RustPlugin {} }`;

    fs.writeFileSync(targetFile, content, 'utf8');
    return { success: true, message: `Плагин ${plugin.name} успешно установлен в ${targetFile}!` };
  }

  public uninstallPlugin(serverDir: string, framework: string, pluginId: string): { success: boolean; message: string } {
    const isCarbon = framework.startsWith('carbon');
    const pluginsDir = path.join(serverDir, isCarbon ? 'carbon' : 'oxide', 'plugins');
    const targetFile = path.join(pluginsDir, `${pluginId}.cs`);

    if (fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
      return { success: true, message: `Плагин ${pluginId} удален.` };
    }

    return { success: false, message: `Файл плагина ${pluginId}.cs не найден.` };
  }
}
