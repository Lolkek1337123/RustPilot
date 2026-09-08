using System;
using System.Collections.Generic;

namespace Oxide.Core.Libraries
{
    public class Timer
    {
        public class TimerInstance
        {
            public Action Callback { get; private set; }
            public float Interval { get; private set; }
            public int Repeats { get; private set; }
            public int CurrentCount { get; private set; }
            public float Elapsed { get; set; }
            public bool Destroyed { get; private set; }

            public TimerInstance(float interval, int repeats, Action callback)
            {
                Interval = interval;
                Repeats = repeats;
                Callback = callback;
                CurrentCount = 0;
                Elapsed = 0f;
                Destroyed = false;
            }

            public void Destroy()
            {
                Destroyed = true;
            }

            public void Tick(float delta)
            {
                if (Destroyed) return;

                Elapsed += delta;
                if (Elapsed >= Interval)
                {
                    Elapsed -= Interval;
                    CurrentCount++;
                    try
                    {
                        if (Callback != null) Callback();
                    }
                    catch (Exception ex)
                    {
                        Interface.Oxide.LogError(string.Format("[Oxide.Timer] Exception in timer callback: {0}", ex));
                    }

                    if (Repeats > 0 && CurrentCount >= Repeats)
                    {
                        Destroy();
                    }
                }
            }
        }

        private readonly List<TimerInstance> activeTimers = new List<TimerInstance>();
        private readonly List<TimerInstance> pendingAdd = new List<TimerInstance>();

        public TimerInstance Once(float seconds, Action callback)
        {
            TimerInstance timer = new TimerInstance(seconds, 1, callback);
            lock (pendingAdd)
            {
                pendingAdd.Add(timer);
            }
            return timer;
        }

        public TimerInstance Repeat(float seconds, int repeats, Action callback)
        {
            TimerInstance timer = new TimerInstance(seconds, repeats, callback);
            lock (pendingAdd)
            {
                pendingAdd.Add(timer);
            }
            return timer;
        }

        public void Update(float delta)
        {
            lock (pendingAdd)
            {
                if (pendingAdd.Count > 0)
                {
                    activeTimers.AddRange(pendingAdd);
                    pendingAdd.Clear();
                }
            }

            for (int i = activeTimers.Count - 1; i >= 0; i--)
            {
                TimerInstance timer = activeTimers[i];
                if (timer.Destroyed)
                {
                    activeTimers.RemoveAt(i);
                }
                else
                {
                    timer.Tick(delta);
                }
            }
        }
    }
}
