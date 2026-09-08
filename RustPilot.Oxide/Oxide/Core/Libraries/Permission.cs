using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using Oxide.Core.Plugins;

namespace Oxide.Core.Libraries
{
    public class Permission
    {
        public class UserData
        {
            public string LastSeenNickname { get; set; }
            public List<string> Permissions { get; set; }
            public List<string> Groups { get; set; }

            public UserData()
            {
                LastSeenNickname = string.Empty;
                Permissions = new List<string>();
                Groups = new List<string> { "default" };
            }
        }

        public class GroupData
        {
            public string Title { get; set; }
            public int Rank { get; set; }
            public List<string> Permissions { get; set; }
            public string ParentGroup { get; set; }

            public GroupData()
            {
                Title = string.Empty;
                Rank = 0;
                Permissions = new List<string>();
                ParentGroup = null;
            }
        }

        private readonly Dictionary<string, UserData> users = new Dictionary<string, UserData>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, GroupData> groups = new Dictionary<string, GroupData>(StringComparer.OrdinalIgnoreCase);
        private readonly List<string> registeredPermissions = new List<string>();

        private string UsersFilePath
        {
            get { return Path.Combine(Interface.Oxide.DataDirectory, "oxide.users.json"); }
        }

        private string GroupsFilePath
        {
            get { return Path.Combine(Interface.Oxide.DataDirectory, "oxide.groups.json"); }
        }

        public Permission()
        {
            LoadData();
        }

        public void RegisterPermission(string name, Plugin plugin)
        {
            if (string.IsNullOrEmpty(name)) return;
            string prefix = plugin.Name.ToLower() + ".";
            string fullName = name.StartsWith(prefix) ? name : prefix + name;
            string lower = fullName.ToLower();
            if (!registeredPermissions.Contains(lower))
            {
                registeredPermissions.Add(lower);
            }
        }

        public bool PermissionExists(string name)
        {
            return registeredPermissions.Contains(name.ToLower());
        }

        public bool UserHasPermission(string userId, string permissionName)
        {
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(permissionName)) return false;

            string perm = permissionName.ToLower();

            UserData user;
            if (users.TryGetValue(userId, out user))
            {
                if (user.Permissions.Contains(perm) || user.Permissions.Contains("*")) return true;

                foreach (string groupName in user.Groups)
                {
                    if (GroupHasPermission(groupName, perm)) return true;
                }
            }
            else
            {
                if (GroupHasPermission("default", perm)) return true;
            }

            return false;
        }

        public bool GroupHasPermission(string groupName, string permissionName)
        {
            GroupData group;
            if (groups.TryGetValue(groupName, out group))
            {
                if (group.Permissions.Contains(permissionName.ToLower()) || group.Permissions.Contains("*")) return true;
                if (!string.IsNullOrEmpty(group.ParentGroup))
                {
                    return GroupHasPermission(group.ParentGroup, permissionName);
                }
            }
            return false;
        }

        public void GrantUserPermission(string userId, string permissionName, Plugin plugin)
        {
            UserData user;
            if (!users.TryGetValue(userId, out user))
            {
                user = new UserData();
                users[userId] = user;
            }
            string perm = permissionName.ToLower();
            if (!user.Permissions.Contains(perm)) user.Permissions.Add(perm);
            SaveData();
        }

        public void RevokeUserPermission(string userId, string permissionName)
        {
            UserData user;
            if (users.TryGetValue(userId, out user))
            {
                user.Permissions.Remove(permissionName.ToLower());
                SaveData();
            }
        }

        public bool GroupExists(string name)
        {
            return groups.ContainsKey(name);
        }

        public void CreateGroup(string name, string title, int rank)
        {
            if (!groups.ContainsKey(name))
            {
                GroupData g = new GroupData();
                g.Title = title;
                g.Rank = rank;
                groups[name] = g;
                SaveData();
            }
        }

        public void GrantGroupPermission(string groupName, string permissionName, Plugin plugin)
        {
            GroupData group;
            if (!groups.TryGetValue(groupName, out group))
            {
                group = new GroupData();
                group.Title = groupName;
                groups[groupName] = group;
            }
            string perm = permissionName.ToLower();
            if (!group.Permissions.Contains(perm)) group.Permissions.Add(perm);
            SaveData();
        }

        public void AddUserGroup(string userId, string groupName)
        {
            UserData user;
            if (!users.TryGetValue(userId, out user))
            {
                user = new UserData();
                users[userId] = user;
            }
            string g = groupName.ToLower();
            if (!user.Groups.Contains(g)) user.Groups.Add(g);
            SaveData();
        }

        public void RemoveUserGroup(string userId, string groupName)
        {
            UserData user;
            if (users.TryGetValue(userId, out user))
            {
                user.Groups.Remove(groupName.ToLower());
                SaveData();
            }
        }

        public void LoadData()
        {
            try
            {
                if (File.Exists(UsersFilePath))
                {
                    Dictionary<string, UserData> loadedUsers = JsonConvert.DeserializeObject<Dictionary<string, UserData>>(File.ReadAllText(UsersFilePath));
                    if (loadedUsers != null)
                    {
                        foreach (KeyValuePair<string, UserData> kvp in loadedUsers) users[kvp.Key] = kvp.Value;
                    }
                }

                if (File.Exists(GroupsFilePath))
                {
                    Dictionary<string, GroupData> loadedGroups = JsonConvert.DeserializeObject<Dictionary<string, GroupData>>(File.ReadAllText(GroupsFilePath));
                    if (loadedGroups != null)
                    {
                        foreach (KeyValuePair<string, GroupData> kvp in loadedGroups) groups[kvp.Key] = kvp.Value;
                    }
                }

                if (!groups.ContainsKey("default"))
                {
                    GroupData d = new GroupData();
                    d.Title = "Default Player";
                    d.Rank = 0;
                    groups["default"] = d;
                }
                if (!groups.ContainsKey("admin"))
                {
                    GroupData a = new GroupData();
                    a.Title = "Administrator";
                    a.Rank = 10;
                    a.Permissions = new List<string> { "*" };
                    groups["admin"] = a;
                }
            }
            catch (Exception ex)
            {
                Interface.Oxide.LogError(string.Format("[Oxide.Permission] Error loading permissions: {0}", ex));
            }
        }

        public void SaveData()
        {
            try
            {
                File.WriteAllText(UsersFilePath, JsonConvert.SerializeObject(users, Formatting.Indented));
                File.WriteAllText(GroupsFilePath, JsonConvert.SerializeObject(groups, Formatting.Indented));
            }
            catch (Exception ex)
            {
                Interface.Oxide.LogError(string.Format("[Oxide.Permission] Error saving permissions: {0}", ex));
            }
        }
    }
}
