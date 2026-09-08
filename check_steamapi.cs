using System;
using System.Reflection;

public class CheckSteamAPI {
    public static void Main() {
        try {
            Assembly a = Assembly.LoadFrom(@"D:\ai\servers\Rust_Devblog_65\client\RustClient_Data\Managed\Assembly-CSharp-firstpass.dll");
            Type t = a.GetType("Steamworks.SteamAPI");
            if (t != null) {
                foreach (var m in t.GetMethods()) {
                    Console.WriteLine("Method: " + m.Name);
                }
            } else {
                Console.WriteLine("Type SteamAPI not found.");
            }
        } catch (Exception ex) {
            Console.WriteLine(ex);
        }
    }
}
