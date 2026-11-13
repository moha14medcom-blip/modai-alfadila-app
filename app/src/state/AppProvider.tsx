import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext, type AppApi, type Stats } from './context';
import { db } from '../lib/repo';
import { fileToDataUrl, supabase, uploadMedia } from '../lib/supabaseClient';
import { lsGetRaw, lsSetRaw } from '../lib/storage';
import {
  APP_NAME,
  DEFAULT_CONFIG,
  DEFAULT_SOUND_SETTINGS,
  DEFAULT_THEME,
  DEFAULT_TIMER,
  DEFAULT_TIP,
  DEFAULT_UNITS,
  DEFAULT_VOLUME,
  LS_KEYS,
} from '../lib/defaults';
import {
  FR,
  dayKey,
  fmtEgp,
  levelProgress,
  nextStreak,
  r2,
  uid,
  weekKey,
} from '../lib/formulas';
import { applyTheme, isThemeId } from '../lib/themes';
import { levelUpFanfare, playSound } from '../lib/sounds';
import { notify, requestNotifyPermission } from '../lib/notify';
import {
  BackupError,
  backupFileName,
  buildBackup,
  downloadJson,
  profilePatchFromBackup,
  readJsonFile,
  remapBackup,
  validateBackup,
} from '../lib/backup';
import { makeProfile, newLocalProfileId } from '../lib/profile';
import { DEMO_PLAYERS } from '../lib/demo';
import type { Entity } from '../lib/collections';
import type {
  Announcement,
  Cheer,
  FocusLog,
  Friendship,
  GrantInput,
  ID,
  InventoryItem,
  LevelsConfig,
  Profile,
  Project,
  RewardRequest,
  RewardUnit,
  SoundId,
  SoundSettings,
  StoreItem,
  Task,
  TaskList,
  ThemeId,
  TimerMode,
  TimerState,
  Toast,
  Tone,
} from '../lib/types';

/* ---------- helpers ---------- */

const ent = <T extends { id: string }>(row: T): Entity => row as unknown as Entity;

const upsertIn = <T extends { id: string }>(arr: T[], row: T): T[] =>
  arr.some((x) => x.id === row.id) ? arr.map((x) => (x.id === row.id ? row : x)) : [row, ...arr];

const patchIn = <T extends { id: string }>(arr: T[], id: string, patch: Partial<T>): T[] =>
  arr.map((x) => (x.id === id ? { ...x, ...patch } : x));

const removeIn = <T extends { id: string }>(arr: T[], id: string): T[] =>
  arr.filter((x) => x.id !== id);

interface SettingsRow extends Entity {
  data: Record<string, unknown>;
}

const SETTINGS_LEVELS = 'levels';
const SETTINGS_TIP = 'tip';

/* ---------- provider ---------- */

export function AppProvider({ children }: { children: React.ReactNode }) {
  const cloud = Boolean(supabase);

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ id: ID; email: string | null } | null>(
    cloud ? null : { id: newLocalProfileId(), email: null }
  );
  const [profile, setProfile] = useState<Profile>(() => makeProfile(newLocalProfileId(), null));
  const [config, setConfig] = useState<LevelsConfig>(DEFAULT_CONFIG);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<FocusLog[]>([]);
  const [units, setUnits] = useState<RewardUnit[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [tip, setTip] = useState(DEFAULT_TIP);
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [sounds, setSoundsState] = useState<SoundSettings>(DEFAULT_SOUND_SETTINGS);
  const [soundVolume, setSoundVolumeState] = useState(DEFAULT_VOLUME);
  const [notifyOn, setNotifyOnState] = useState(false);
  const [timer, setTimerState] = useState<TimerState>(DEFAULT_TIMER);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const profileRef = useRef(profile);
  profileRef.current = profile;
  const configRef = useRef(config);
  configRef.current = config;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const volumeRef = useRef(soundVolume);
  volumeRef.current = soundVolume;
  const notifyRef = useRef(notifyOn);
  notifyRef.current = notifyOn;
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

  const isAdmin = useMemo(() => {
    const email = (user?.email ?? '').toLowerCase();
    const adminEmail =
      (import.meta.env.VITE_SUPER_ADMIN_EMAIL as string | undefined)?.toLowerCase() ??
      'moha14med.com@gmail.com';
    return email.length > 0 && email === adminEmail;
  }, [user]);

  /* ---------- toasts ---------- */

  const toastTimers = useRef<number[]>([]);
  const dismissToast = useCallback((id: ID) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const toast = useCallback(
    (text: string, tone: Tone = 'info') => {
      const id = uid('t_');
      setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
      const handle = window.setTimeout(() => dismissToast(id), 3600);
      toastTimers.current.push(handle);
    },
    [dismissToast]
  );
  useEffect(
    () => () => {
      toastTimers.current.forEach((h) => window.clearTimeout(h));
    },
    []
  );

  /* ---------- preferences (instant boot) ---------- */

  useEffect(() => {
    const storedTheme = lsGetRaw<ThemeId>(LS_KEYS.theme);
    const t: ThemeId = isThemeId(storedTheme) ? storedTheme : DEFAULT_THEME;
    setThemeState(t);
    applyTheme(t);

    const storedTimer = lsGetRaw<TimerState>(LS_KEYS.timer);
    if (storedTimer && typeof storedTimer === 'object') {
      setTimerState({ ...DEFAULT_TIMER, ...storedTimer, pomo: { ...DEFAULT_TIMER.pomo, ...storedTimer.pomo } });
    }
    const storedSounds = lsGetRaw<SoundSettings>(LS_KEYS.sounds);
    if (storedSounds) setSoundsState({ ...DEFAULT_SOUND_SETTINGS, ...storedSounds });

    const storedVolume = lsGetRaw<number>(LS_KEYS.volume);
    if (typeof storedVolume === 'number') setSoundVolumeState(storedVolume);

    const storedNotify = lsGetRaw<boolean>(LS_KEYS.notify);
    if (typeof storedNotify === 'boolean') setNotifyOnState(storedNotify);
  }, []);

  /* ---------- connectivity + queue wiring ---------- */

  useEffect(() => {
    db.onQueue = (n: number) => setPending(n);
    db.onSyncing = (s: boolean) => setSyncing(s);
    void db.loadQueue().then(() => setPending(db.pending));

    const goOnline = () => {
      setOnline(true);
      void db.flush().then((n) => setPending(n));
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  /* ---------- auth ---------- */

  useEffect(() => {
    if (!supabase) return;
    let sub: { unsubscribe: () => void } | null = null;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? null });
      } else {
        setUser(null);
        setReady(true);
      }
    })();
    const res = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email ?? null });
      else {
        setUser(null);
        setReady(true);
      }
    });
    sub = res.data.subscription;
    return () => sub?.unsubscribe();
  }, []);

  /* ---------- bootstrap / hydrate ---------- */

  const loadLocal = useCallback(async (ownerId: ID) => {
    const [
      p,
      prj,
      lst,
      tsk,
      inv,
      flogs,
      unit,
      req,
      items,
      frd,
      profiles,
      ch,
      ann,
      settings,
    ] = await Promise.all([
      db.local.getShared<Profile>('profiles', ownerId),
      db.local.select<Project>('projects', ownerId),
      db.local.select<TaskList>('lists', ownerId),
      db.local.select<Task>('tasks', ownerId),
      db.local.select<InventoryItem>('inventory', ownerId),
      db.local.select<FocusLog>('focus_logs', ownerId),
      db.local.selectShared<RewardUnit>('reward_units'),
      db.local.selectShared<RewardRequest>('reward_requests'),
      db.local.selectShared<StoreItem>('store_items'),
      db.local.selectShared<Friendship>('friends'),
      db.local.selectShared<Profile>('profiles'),
      db.local.selectShared<Cheer>('cheers'),
      db.local.selectShared<Announcement>('announcements'),
      db.local.selectShared<SettingsRow>('settings'),
    ]);

    const levelsRow = settings.find((s) => s.id === SETTINGS_LEVELS);
    const tipRow = settings.find((s) => s.id === SETTINGS_TIP);
    const nextConfig: LevelsConfig = {
      ...DEFAULT_CONFIG,
      ...((levelsRow?.data ?? {}) as Partial<LevelsConfig>),
      overrides: { ...((levelsRow?.data?.overrides ?? {}) as Record<string, number>) },
    };

    setConfig(nextConfig);
    setProjects(prj);
    setLists(lst);
    setTasks(tsk);
    setInventory(inv);
    setLogs(flogs.sort((a, b) => (a.at < b.at ? 1 : -1)));
    setUnits(unit.length ? unit.sort((a, b) => a.order - b.order) : DEFAULT_UNITS);
    setRequests(req);
    setStoreItems(items);
    setFriends(frd);
    setCheers(ch.sort((a, b) => (a.at < b.at ? 1 : -1)));
    setAllProfiles(profiles);
    setAnnouncement(ann.length ? ann.sort((a, b) => (a.at < b.at ? 1 : -1))[0] : null);
    setTip(String(tipRow?.data?.text ?? DEFAULT_TIP));

    const base = p ?? makeProfile(ownerId, user?.email ?? null);
    const wk = weekKey();
    const weeklyReset =
      base.weeklyWeek !== wk
        ? { weeklyWeek: wk, weeklyTasks: 0, weeklyFocusMin: 0, weeklyEgp: 0 }
        : {};
    const hydrated: Profile = { ...base, ...weeklyReset, email: user?.email ?? base.email };
    setProfile(hydrated);
    return { profile: hydrated, settingsPresent: Boolean(levelsRow), unitsPresent: unit.length > 0 };
  }, [user?.email]);

  const seedShared = useCallback(
    async (ownerId: ID, state: { settingsPresent: boolean; unitsPresent: boolean }, profileRow: Profile, hasProfile: boolean) => {
      if (!hasProfile) {
        await db.write({
          kind: 'upsert',
          coll: 'profiles',
          shared: true,
          ownerId,
          id: profileRow.id,
          row: ent(profileRow),
        });
      }
      if (!state.unitsPresent) {
        for (const u of DEFAULT_UNITS) {
          await db.write({
            kind: 'upsert',
            coll: 'reward_units',
            shared: true,
            ownerId,
            id: u.id,
            row: ent(u),
          });
        }
      }
      if (!state.settingsPresent) {
        await db.write({
          kind: 'upsert',
          coll: 'settings',
          shared: true,
          ownerId,
          id: SETTINGS_LEVELS,
          row: { id: SETTINGS_LEVELS, data: DEFAULT_CONFIG },
        });
        await db.write({
          kind: 'upsert',
          coll: 'settings',
          shared: true,
          ownerId,
          id: SETTINGS_TIP,
          row: { id: SETTINGS_TIP, data: { text: DEFAULT_TIP, at: new Date().toISOString() } },
        });
      }
    },
    []
  );

  const hydrate = useCallback(
    async (ownerId: ID) => {
      let state = await loadLocal(ownerId);
      const hasProfile = Boolean(await db.local.getShared<Profile>('profiles', ownerId));

      if (db.cloudMode) {
        try {
          await db.flush();
          await db.pullAll(ownerId);
          const local = await db.local.selectShared<Profile>('profiles');
          setAllProfiles(local);
        } catch {
          toast('📴 مفيش اتصال بالسحابة — شغّال من النسخة المحفوظة', 'warn');
        }
        state = await loadLocal(ownerId);
      }

      await seedShared(ownerId, state, state.profile, hasProfile);
      setReady(true);
    },
    [loadLocal, seedShared, toast]
  );

  const hydrating = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      setReady(true);
      return;
    }
    if (hydrating.current === user.id) return;
    hydrating.current = user.id;
    setReady(false);
    void hydrate(user.id);
  }, [user, hydrate]);

  /* refresh shared data when the tab regains focus */
  useEffect(() => {
    if (!db.cloudMode) return;
    const onFocus = () => {
      if (user && document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ---------- ticks: inventory timers + clock ---------- */

  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(handle);
  }, []);

  useEffect(() => {
    const running = inventory.filter((i) => i.running && i.endsAt);
    if (!running.length) return;
    running.forEach((item) => {
      const left = Math.max(0, (item.endsAt ?? 0) - now);
      if (left <= 0) {
        const patch: Partial<InventoryItem> = {
          running: false,
          endsAt: null,
          remainingMs: 0,
          status: 'used',
        };
        setInventory((prev) => patchIn(prev, item.id, patch));
        void db.write({
          kind: 'update',
          coll: 'inventory',
          shared: false,
          ownerId: profileRef.current.id,
          id: item.id,
          patch,
        });
        playSound(soundsRef.current.reward, volumeRef.current);
        toast(`🎉 خلصت مكافأة «${item.name}» — اتمتع بيها!`, 'ok');
        notify('خلصت مكافأتك 🎉', `${item.name} جاهزة للاستخدام`);
      }
    });
  }, [now, inventory, toast]);

  /* ---------- derived ---------- */

  const stats: Stats = useMemo(() => {
    const { need, xpInLevel, progress } = levelProgress(profile, config);
    const today = dayKey();
    const doneToday = tasks.filter((t) => t.done && (t.doneAt ?? '').startsWith(today)).length;
    const focusToday = logs
      .filter((l) => (l.at ?? '').startsWith(today))
      .reduce((sum, l) => sum + l.minutes, 0);
    return {
      need,
      xpInLevel,
      progress,
      doneToday,
      focusToday,
      weekTasks: profile.weeklyTasks,
      weekFocus: profile.weeklyFocusMin,
      weekEgp: profile.weeklyEgp,
    };
  }, [profile, config, tasks, logs]);

  const people = useMemo(() => {
    const others = allProfiles.filter((p) => p.id !== profile.id);
    const pool = db.cloudMode ? others : [...others, ...DEMO_PLAYERS];
    return [profile, ...pool.filter((p) => p.id !== profile.id)];
  }, [allProfiles, profile]);

  /* ---------- low-level profile write ---------- */

  const writeProfile = useCallback(async (patch: Partial<Profile>) => {
    const next = { ...profileRef.current, ...patch };
    setProfile(next);
    try {
      await db.write({
        kind: 'upsert',
        coll: 'profiles',
        shared: true,
        ownerId: next.id,
        id: next.id,
        row: ent(next),
      });
    } catch {
      toast('⚠️ تعذّر حفظ بيانات الحساب — هنعيد المحاولة', 'warn');
    }
    return next;
  }, [toast]);

  /* ---------- rewards ---------- */

  const grantReward = useCallback(
    async (input: GrantInput) => {
      const p = profileRef.current;
      const cfg = configRef.current;
      const egpDelta = input.egp ?? 0;
      const xpDelta = input.xp ?? 0;
      const focusMin = input.focusMin ?? 0;
      const tasksDone = input.tasks ?? 0;

      const { level, xp, leveled } = FR(p, xpDelta, cfg);
      const wk = weekKey();
      const weeklyBase =
        p.weeklyWeek === wk
          ? p
          : { weeklyWeek: wk, weeklyTasks: 0, weeklyFocusMin: 0, weeklyEgp: 0 };

      const patch: Partial<Profile> = {
        level,
        xp,
        egp: Math.max(0, r2(p.egp + egpDelta)),
        totalFocusMin: Math.max(0, p.totalFocusMin + focusMin),
        totalTasks: Math.max(0, p.totalTasks + tasksDone),
        weeklyWeek: wk,
        weeklyTasks: Math.max(0, weeklyBase.weeklyTasks + tasksDone),
        weeklyFocusMin: Math.max(0, weeklyBase.weeklyFocusMin + focusMin),
        weeklyEgp: Math.max(0, r2(weeklyBase.weeklyEgp + egpDelta)),
        streak: nextStreak(p),
        lastActiveDay: dayKey(),
      };

      await writeProfile(patch);

      if (leveled) {
        levelUpFanfare(volumeRef.current);
        toast(`👑 مبروك! وصلت للمستوى ${level}`, 'ok');
        notify(`${APP_NAME} 👑`, `مبروك! وصلت للمستوى ${level}`);
      }
      return { leveled, level };
    },
    [toast, writeProfile]
  );

  /* ---------- tasks ---------- */

  const addProject = useCallback<AppApi['addProject']>(
    async ({ name, emoji, color }) => {
      const owner = profileRef.current.id;
      const order = projects.reduce((m, p) => Math.max(m, p.order ?? 0), 0) + 1;
      const row: Project = {
        id: uid('prj_'),
        ownerId: owner,
        name: name.trim() || 'مشروع جديد',
        color,
        emoji: emoji || '📁',
        order,
        createdAtLocal: new Date().toISOString(),
      };
      setProjects((prev) => [...prev, row]);
      await db.write({ kind: 'insert', coll: 'projects', shared: false, ownerId: owner, id: row.id, row: ent(row) });
      toast(`📁 اتفتح مشروع «${row.name}»`, 'ok');
    },
    [projects, toast]
  );

  const updateProject = useCallback<AppApi['updateProject']>(async (id, patch) => {
    const owner = profileRef.current.id;
    setProjects((prev) => patchIn(prev, id, patch));
    await db.write({ kind: 'update', coll: 'projects', shared: false, ownerId: owner, id, patch });
  }, []);

  const removeProject = useCallback<AppApi['removeProject']>(
    async (id) => {
      const owner = profileRef.current.id;
      const myLists = lists.filter((l) => l.projectId === id);
      const myTasks = tasks.filter((t) => t.projectId === id);
      setProjects((prev) => removeIn(prev, id));
      setLists((prev) => prev.filter((l) => l.projectId !== id));
      setTasks((prev) => prev.filter((t) => t.projectId !== id));
      await db.write({ kind: 'delete', coll: 'projects', shared: false, ownerId: owner, id });
      for (const l of myLists) {
        await db.write({ kind: 'delete', coll: 'lists', shared: false, ownerId: owner, id: l.id });
      }
      for (const t of myTasks) {
        await db.write({ kind: 'delete', coll: 'tasks', shared: false, ownerId: owner, id: t.id });
      }
      toast('🗑️ اتمسح المشروع وكل حاجته', 'warn');
    },
    [lists, tasks, toast]
  );

  const addList = useCallback<AppApi['addList']>(
    async (projectId, { name, emoji }) => {
      const owner = profileRef.current.id;
      const order = lists.filter((l) => l.projectId === projectId).length + 1;
      const row: TaskList = {
        id: uid('lst_'),
        ownerId: owner,
        projectId,
        name: name.trim() || 'قائمة جديدة',
        emoji: emoji || '📋',
        order,
      };
      setLists((prev) => [...prev, row]);
      await db.write({ kind: 'insert', coll: 'lists', shared: false, ownerId: owner, id: row.id, row: ent(row) });
      toast(`📋 اتفتحت قائمة «${row.name}»`, 'ok');
    },
    [lists, toast]
  );

  const updateList = useCallback<AppApi['updateList']>(async (id, patch) => {
    const owner = profileRef.current.id;
    const list = lists.find((l) => l.id === id);
    setLists((prev) => patchIn(prev, id, patch));
    if (list && patch.name && patch.name !== list.name) {
      const affected = tasks.filter((t) => t.listId === id);
      setTasks((prev) => prev.map((t) => (t.listId === id ? { ...t, listName: patch.name! } : t)));
      for (const t of affected) {
        await db.write({
          kind: 'update',
          coll: 'tasks',
          shared: false,
          ownerId: owner,
          id: t.id,
          patch: { listName: patch.name },
        });
      }
    }
    await db.write({ kind: 'update', coll: 'lists', shared: false, ownerId: owner, id, patch });
  }, [lists, tasks]);

  const removeList = useCallback<AppApi['removeList']>(
    async (id) => {
      const owner = profileRef.current.id;
      const myTasks = tasks.filter((t) => t.listId === id);
      setLists((prev) => removeIn(prev, id));
      setTasks((prev) => prev.filter((t) => t.listId !== id));
      await db.write({ kind: 'delete', coll: 'lists', shared: false, ownerId: owner, id });
      for (const t of myTasks) {
        await db.write({ kind: 'delete', coll: 'tasks', shared: false, ownerId: owner, id: t.id });
      }
      toast('🗑️ اتمسحت القائمة', 'warn');
    },
    [tasks, toast]
  );

  const addTask = useCallback<AppApi['addTask']>(
    async (listId, { title, unitId, icon }) => {
      const owner = profileRef.current.id;
      const list = lists.find((l) => l.id === listId);
      if (!list) return;
      const project = projects.find((p) => p.id === list.projectId);
      const unit = units.find((u) => u.id === unitId) ?? units[0];
      const row: Task = {
        id: uid('tsk_'),
        ownerId: owner,
        listId,
        projectId: list.projectId,
        projectName: project?.name ?? '',
        listName: list.name,
        title: title.trim() || 'مهمة جديدة',
        unitId: unit?.id ?? null,
        unitName: unit?.name ?? '',
        unitIcon: unit?.icon ?? '⭐',
        icon: icon || '✅',
        egp: unit?.egp ?? 0,
        xp: unit?.xp ?? 0,
        done: false,
        doneAt: null,
        focusMinutes: 0,
      };
      setTasks((prev) => [row, ...prev]);
      await db.write({ kind: 'insert', coll: 'tasks', shared: false, ownerId: owner, id: row.id, row: ent(row) });
    },
    [lists, projects, units]
  );

  const updateTask = useCallback<AppApi['updateTask']>(
    async (id, patch) => {
      const owner = profileRef.current.id;
      const current = tasksRef.current.find((t) => t.id === id);
      let next = patch;
      if (patch.unitId && current && patch.unitId !== current.unitId) {
        const unit = units.find((u) => u.id === patch.unitId);
        if (unit) next = { ...patch, unitName: unit.name, unitIcon: unit.icon, egp: unit.egp, xp: unit.xp };
      }
      setTasks((prev) => patchIn(prev, id, next));
      await db.write({ kind: 'update', coll: 'tasks', shared: false, ownerId: owner, id, patch: next });
    },
    [units]
  );

  const toggleTask = useCallback<AppApi['toggleTask']>(
    async (id) => {
      const owner = profileRef.current.id;
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;
      const done = !task.done;
      const patch: Partial<Task> = { done, doneAt: done ? new Date().toISOString() : null };
      setTasks((prev) => patchIn(prev, id, patch));
      await db.write({ kind: 'update', coll: 'tasks', shared: false, ownerId: owner, id, patch });
      if (done) {
        await grantReward({ egp: task.egp, xp: task.xp, tasks: 1 });
        playSound(soundsRef.current.reward, volumeRef.current);
        toast(`✅ خلصت «${task.title}» — +${fmtEgp(task.egp)} و +${task.xp} XP`, 'ok');
      } else {
        await grantReward({ egp: -task.egp, xp: -task.xp, tasks: -1 });
        toast('↩️ رجّعنا المهمة وخصمنا المكافأة', 'warn');
      }
    },
    [grantReward, toast]
  );

  const removeTask = useCallback<AppApi['removeTask']>(
    async (id) => {
      const owner = profileRef.current.id;
      setTasks((prev) => removeIn(prev, id));
      await db.write({ kind: 'delete', coll: 'tasks', shared: false, ownerId: owner, id });
    },
    []
  );

  /* ---------- focus ---------- */

  const commitFocus = useCallback<AppApi['commitFocus']>(
    async (minutes, opts) => {
      const p = profileRef.current;
      const cfg = configRef.current;
      const mins = Math.max(0, Math.round(minutes));
      if (mins < 1) return { egp: 0, xp: 0 };
      const egp = r2(mins * cfg.egpPerMinute);
      const xp = r2(mins * cfg.xpPerMinute);
      const task = opts.taskId ? tasksRef.current.find((t) => t.id === opts.taskId) ?? null : null;
      const row: FocusLog = {
        id: uid('log_'),
        ownerId: p.id,
        minutes: mins,
        egp,
        xp,
        mode: opts.mode,
        taskId: task?.id ?? null,
        taskTitle: task?.title ?? '',
        listId: task?.listId ?? null,
        at: new Date().toISOString(),
      };
      setLogs((prev) => [row, ...prev].slice(0, 800));
      await db.write({
        kind: 'insert',
        coll: 'focus_logs',
        shared: false,
        ownerId: p.id,
        id: row.id,
        row: ent(row),
      });
      if (task) {
        const patch = { focusMinutes: (task.focusMinutes ?? 0) + mins };
        setTasks((prev) => patchIn(prev, task.id, patch));
        await db.write({ kind: 'update', coll: 'tasks', shared: false, ownerId: p.id, id: task.id, patch });
      }
      await grantReward({ egp, xp, focusMin: mins });
      toast(`⏱️ جلسة ${mins} دقيقة — +${fmtEgp(egp)} و +${xp} XP`, 'ok');
      return { egp, xp };
    },
    [grantReward, toast]
  );

  /* ---------- store & inventory ---------- */

  const buyItem = useCallback<AppApi['buyItem']>(
    async (item) => {
      const p = profileRef.current;
      if (p.egp < item.egp) {
        toast('رصيدك مش كفاية 💸 — كمّل مهام الأول', 'bad');
        return false;
      }
      const row: InventoryItem = {
        id: uid('inv_'),
        ownerId: p.id,
        itemId: item.id,
        name: item.name,
        desc: item.desc,
        egp: item.egp,
        icon: item.icon,
        durationMin: item.durationMin,
        remainingMs: item.durationMin * 60000,
        running: false,
        endsAt: null,
        status: 'ready',
        boughtAt: new Date().toISOString(),
      };
      const prevProfile = p;
      const prevInventory = inventory;
      setInventory((prev) => [row, ...prev]);
      await writeProfile({ egp: r2(p.egp - item.egp) });
      try {
        await db.write({
          kind: 'insert',
          coll: 'inventory',
          shared: false,
          ownerId: p.id,
          id: row.id,
          row: ent(row),
        });
        toast(`🎁 اشتريت «${item.name}» — شغّلها من حقيبتك`, 'ok');
        return true;
      } catch {
        setInventory(prevInventory);
        await writeProfile({ egp: prevProfile.egp });
        toast('⚠️ تعذّر إتمام الشراء — رجع رصيدك', 'bad');
        return false;
      }
    },
    [inventory, toast, writeProfile]
  );

  const inventoryAction = useCallback<AppApi['inventoryAction']>(
    async (id, action) => {
      const owner = profileRef.current.id;
      const item = inventory.find((i) => i.id === id);
      if (!item) return;
      let patch: Partial<InventoryItem>;
      if (action === 'activate' || action === 'resume') {
        patch = {
          running: true,
          status: 'active',
          endsAt: Date.now() + Math.max(1000, item.remainingMs || item.durationMin * 60000),
        };
        toast(`▶️ شغّلنا «${item.name}»`, 'ok');
      } else if (action === 'pause') {
        patch = {
          running: false,
          status: 'ready',
          remainingMs: Math.max(0, (item.endsAt ?? Date.now()) - Date.now()),
          endsAt: null,
        };
        toast('⏸️ وقفنا العداد مؤقتًا', 'warn');
      } else {
        patch = { running: false, status: 'used', endsAt: null, remainingMs: 0 };
        toast(`🍬 استخدمت «${item.name}» — استمتع`, 'ok');
        playSound(soundsRef.current.reward, volumeRef.current);
      }
      setInventory((prev) => patchIn(prev, id, patch));
      await db.write({ kind: 'update', coll: 'inventory', shared: false, ownerId: owner, id, patch });
    },
    [inventory, toast]
  );

  const saveStoreItemInternal = useCallback(
    async (req: RewardRequest) => {
      const p = profileRef.current;
      const item: StoreItem = {
        id: uid('itm_'),
        name: req.name,
        desc: req.desc,
        egp: req.egp,
        icon: req.icon,
        durationMin: req.durationMin,
        active: true,
        ownerId: p.id,
        requestedBy: req.username,
        sourceRequest: req.id,
      };
      setStoreItems((prev) => upsertIn(prev, item));
      await db.write({
        kind: 'upsert',
        coll: 'store_items',
        shared: true,
        ownerId: p.id,
        id: item.id,
        row: ent(item),
      });
      return item;
    },
    []
  );

  const suggestReward = useCallback<AppApi['suggestReward']>(
    async ({ name, desc, icon, egp, durationMin }) => {
      const p = profileRef.current;
      const cfg = configRef.current;
      const auto = cfg.autoApprove;
      const row: RewardRequest = {
        id: uid('rq_'),
        name: name.trim() || 'مكافأة مقترحة',
        desc: desc.trim(),
        icon: icon || '🎁',
        egp: Math.max(0, r2(egp)),
        kind: 'store',
        durationMin: Math.max(1, Math.round(durationMin)),
        status: auto ? 'approved' : 'pending',
        userId: p.id,
        userName: p.displayName,
        username: p.username,
        at: new Date().toISOString(),
      };
      setRequests((prev) => [row, ...prev]);
      await db.write({
        kind: 'upsert',
        coll: 'reward_requests',
        shared: true,
        ownerId: p.id,
        id: row.id,
        row: ent(row),
      });
      if (auto) {
        await saveStoreItemInternal(row);
        toast('✅ تمت الموافقة تلقائيًا — المكافأة في المتجر', 'ok');
      } else {
        toast('📨 اتحفظ — قيد المراجعة عند الأدمن', 'info');
      }
    },
    [saveStoreItemInternal, toast]
  );

  const saveStoreItem = useCallback<AppApi['saveStoreItem']>(
    async (input) => {
      const p = profileRef.current;
      const existing = input.id ? storeItems.find((i) => i.id === input.id) : undefined;
      const item: StoreItem = {
        id: input.id ?? uid('itm_'),
        name: input.name ?? existing?.name ?? 'مكافأة',
        desc: input.desc ?? existing?.desc ?? '',
        egp: Math.max(0, r2(input.egp ?? existing?.egp ?? 0)),
        icon: input.icon ?? existing?.icon ?? '🎁',
        durationMin: Math.max(1, Math.round(input.durationMin ?? existing?.durationMin ?? 30)),
        active: input.active ?? existing?.active ?? true,
        ownerId: p.id,
        requestedBy: input.requestedBy ?? existing?.requestedBy,
        sourceRequest: input.sourceRequest ?? existing?.sourceRequest,
      };
      setStoreItems((prev) => upsertIn(prev, item));
      await db.write({
        kind: 'upsert',
        coll: 'store_items',
        shared: true,
        ownerId: p.id,
        id: item.id,
        row: ent(item),
      });
    },
    [storeItems]
  );

  const removeStoreItem = useCallback<AppApi['removeStoreItem']>(async (id) => {
    const p = profileRef.current;
    setStoreItems((prev) => removeIn(prev, id));
    await db.write({ kind: 'delete', coll: 'store_items', shared: true, ownerId: p.id, id });
  }, []);

  /* ---------- profile & backup ---------- */

  const saveProfile = useCallback<AppApi['saveProfile']>(
    async (patch) => {
      await writeProfile(patch);
      toast('💾 اتحفظ', 'ok');
    },
    [toast, writeProfile]
  );

  const uploadAvatar = useCallback<AppApi['uploadAvatar']>(
    async (file, kind) => {
      const p = profileRef.current;
      if (file.size > 6 * 1024 * 1024) {
        toast('⚠️ الصورة كبيرة — الحد 6 ميجا', 'bad');
        return;
      }
      try {
        let url = '';
        if (supabase && user) {
          url = await uploadMedia(supabase, user.id, file, kind === 'avatar' ? 'avatars' : 'covers');
        } else {
          url = await fileToDataUrl(file);
        }
        await writeProfile(kind === 'avatar' ? { avatarUrl: url } : { coverUrl: url });
        toast('🖼️ اتحدّثت الصورة', 'ok');
      } catch {
        toast('⚠️ تعذّر رفع الصورة', 'bad');
      }
    },
    [toast, user, writeProfile]
  );

  const exportBackup = useCallback<AppApi['exportBackup']>(async () => {
    const doc = buildBackup({
      account: { id: profileRef.current.id, email: profileRef.current.email },
      profile: profileRef.current,
      projects,
      lists,
      tasks,
      inventory,
      theme,
      sounds,
      volume: soundVolume,
      notifyOn,
      config,
    });
    downloadJson(backupFileName(), doc);
    toast('📤 نزّلنا نسخة احتياطية من بياناتك', 'ok');
  }, [config, inventory, lists, notifyOn, projects, soundVolume, sounds, tasks, theme, toast]);

  const importBackup = useCallback<AppApi['importBackup']>(
    async (file) => {
      try {
        const json = await readJsonFile(file);
        const doc = validateBackup(json);
        const owner = profileRef.current.id;
        const { projects: newProjects, lists: newLists, tasks: newTasks, inventory: newInventory } =
          remapBackup(doc, owner);

        setProjects(newProjects);
        setLists(newLists);
        setTasks(newTasks);
        setInventory(newInventory);

        for (const p of newProjects) {
          await db.write({ kind: 'upsert', coll: 'projects', shared: false, ownerId: owner, id: p.id, row: ent(p) });
        }
        for (const l of newLists) {
          await db.write({ kind: 'upsert', coll: 'lists', shared: false, ownerId: owner, id: l.id, row: ent(l) });
        }
        for (const t of newTasks) {
          await db.write({ kind: 'upsert', coll: 'tasks', shared: false, ownerId: owner, id: t.id, row: ent(t) });
        }
        for (const i of newInventory) {
          await db.write({ kind: 'upsert', coll: 'inventory', shared: false, ownerId: owner, id: i.id, row: ent(i) });
        }

        const patch = profilePatchFromBackup(doc);
        await writeProfile(patch);
        setConfig(doc.settings.config);
        await db.write({
          kind: 'upsert',
          coll: 'settings',
          shared: true,
          ownerId: owner,
          id: SETTINGS_LEVELS,
          row: { id: SETTINGS_LEVELS, data: doc.settings.config },
        });
        if (doc.settings.theme && isThemeId(doc.settings.theme)) {
          setTheme(doc.settings.theme);
        }
        setSoundsState(doc.settings.sounds);
        lsSetRaw(LS_KEYS.sounds, doc.settings.sounds);
        setSoundVolumeState(doc.settings.volume);
        lsSetRaw(LS_KEYS.volume, doc.settings.volume);
        setNotifyOnState(doc.settings.notifyOn);
        lsSetRaw(LS_KEYS.notify, doc.settings.notifyOn);
        toast('✅ تم استيراد النسخة الاحتياطية', 'ok');
      } catch (err) {
        if (err instanceof BackupError) toast('❌ الملف ده مش نسخة احتياطية للتطبيق', 'bad');
        else toast('❌ تعذّر قراءة الملف', 'bad');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast, writeProfile]
  );

  const refresh = useCallback<AppApi['refresh']>(async () => {
    if (!user) return;
    if (!db.cloudMode) {
      await loadLocal(user.id);
      return;
    }
    setSyncing(true);
    try {
      await db.flush();
      await db.pullAll(user.id);
      await loadLocal(user.id);
    } catch {
      toast('📴 تعذّر التحديث من السحابة', 'warn');
    } finally {
      setSyncing(false);
    }
  }, [loadLocal, toast, user]);

  /* ---------- social ---------- */

  const sendFriendRequest = useCallback<AppApi['sendFriendRequest']>(
    async (username) => {
      const p = profileRef.current;
      const clean = username.trim().replace(/^@/, '').toLowerCase();
      const target = people.find((x) => x.username.toLowerCase() === clean);
      if (!target) {
        toast('🔎 مفيش حد بالاسم ده', 'warn');
        return;
      }
      if (target.id === p.id) {
        toast('🙃 ما تقدرش تبعت لنفسك', 'warn');
        return;
      }
      const exists = friends.some(
        (f) =>
          (f.fromId === p.id && f.toId === target.id) || (f.fromId === target.id && f.toId === p.id)
      );
      if (exists) {
        toast('👥 الصداقة موجودة بالفعل', 'warn');
        return;
      }
      const row: Friendship = {
        id: uid('frd_'),
        fromId: p.id,
        fromName: p.displayName,
        fromUsername: p.username,
        toId: target.id,
        toName: target.displayName,
        toUsername: target.username,
        status: 'pending',
        at: new Date().toISOString(),
      };
      setFriends((prev) => [row, ...prev]);
      await db.write({ kind: 'insert', coll: 'friends', shared: true, ownerId: p.id, id: row.id, row: ent(row) });
      toast(`📨 بعتنا طلب صداقة لـ ${target.displayName}`, 'ok');
    },
    [friends, people, toast]
  );

  const respondFriend = useCallback<AppApi['respondFriend']>(
    async (id, accept) => {
      const p = profileRef.current;
      if (accept) {
        setFriends((prev) => patchIn(prev, id, { status: 'accepted' as const }));
        await db.write({
          kind: 'update',
          coll: 'friends',
          shared: true,
          ownerId: p.id,
          id,
          patch: { status: 'accepted' },
        });
        toast('🤝 بقيتوا أصحاب', 'ok');
      } else {
        setFriends((prev) => removeIn(prev, id));
        await db.write({ kind: 'delete', coll: 'friends', shared: true, ownerId: p.id, id });
        toast('❌ اترفض الطلب', 'warn');
      }
    },
    [toast]
  );

  const removeFriend = useCallback<AppApi['removeFriend']>(async (id) => {
    const p = profileRef.current;
    setFriends((prev) => removeIn(prev, id));
    await db.write({ kind: 'delete', coll: 'friends', shared: true, ownerId: p.id, id });
    toast('👋 اتفكّت الصداقة', 'warn');
  }, [toast]);

  const sendCheer = useCallback<AppApi['sendCheer']>(
    async (toId, text) => {
      const p = profileRef.current;
      const row: Cheer = {
        id: uid('chr_'),
        fromId: p.id,
        fromName: p.displayName,
        toId,
        text: text.trim().slice(0, 120) || 'كمّل كده! 💪',
        at: new Date().toISOString(),
      };
      setCheers((prev) => [row, ...prev]);
      await db.write({ kind: 'insert', coll: 'cheers', shared: true, ownerId: p.id, id: row.id, row: ent(row) });
      toast('📣 وصل التشجيع', 'ok');
    },
    [toast]
  );

  /* ---------- admin ---------- */

  const saveConfig = useCallback<AppApi['saveConfig']>(
    async (patch) => {
      const owner = profileRef.current.id;
      const next = { ...configRef.current, ...patch };
      setConfig(next);
      await db.write({
        kind: 'upsert',
        coll: 'settings',
        shared: true,
        ownerId: owner,
        id: SETTINGS_LEVELS,
        row: { id: SETTINGS_LEVELS, data: next },
      });
      toast('📐 اتحدّث منحنى الخبرة', 'ok');
    },
    [toast]
  );

  const saveUnit = useCallback<AppApi['saveUnit']>(
    async (unit) => {
      const owner = profileRef.current.id;
      setUnits((prev) => upsertIn(prev, unit).sort((a, b) => a.order - b.order));
      await db.write({
        kind: 'upsert',
        coll: 'reward_units',
        shared: true,
        ownerId: owner,
        id: unit.id,
        row: ent(unit),
      });
      toast('🧩 اتحدّثت وحدة المكافأة', 'ok');
    },
    [toast]
  );

  const removeUnit = useCallback<AppApi['removeUnit']>(async (id) => {
    const owner = profileRef.current.id;
    setUnits((prev) => removeIn(prev, id));
    await db.write({ kind: 'delete', coll: 'reward_units', shared: true, ownerId: owner, id });
    toast('🗑️ اتمسحت الوحدة', 'warn');
  }, [toast]);

  const decideRequest = useCallback<AppApi['decideRequest']>(
    async (id, action) => {
      const p = profileRef.current;
      const req = requests.find((r) => r.id === id);
      if (!req) return;
      if (action === 'reject') {
        setRequests((prev) => patchIn(prev, id, { status: 'rejected' as const }));
        await db.write({
          kind: 'update',
          coll: 'reward_requests',
          shared: true,
          ownerId: p.id,
          id,
          patch: { status: 'rejected' },
        });
        toast('❌ اترفض الطلب', 'warn');
        return;
      }
      setRequests((prev) => patchIn(prev, id, { status: 'approved' as const }));
      await db.write({
        kind: 'update',
        coll: 'reward_requests',
        shared: true,
        ownerId: p.id,
        id,
        patch: { status: 'approved' },
      });
      if (action === 'approve') {
        await saveStoreItemInternal({ ...req, kind: 'store' });
        toast('✅ نوافق وننشر في المتجر', 'ok');
      } else {
        await saveStoreItemInternal({ ...req, kind: 'personal' });
        toast('🔒 موافقة شخصية — بس صاحب الطلب يشوفها', 'ok');
      }
    },
    [requests, saveStoreItemInternal, toast]
  );

  const adminUpdateUser = useCallback<AppApi['adminUpdateUser']>(
    async (id, patch) => {
      const target = people.find((x) => x.id === id);
      if (!target) return;
      const next = { ...target, ...patch };
      setAllProfiles((prev) => upsertIn(prev, next));
      if (next.id === profileRef.current.id) setProfile(next);
      await db.write({
        kind: 'upsert',
        coll: 'profiles',
        shared: true,
        ownerId: next.id,
        id: next.id,
        row: ent(next),
      });
      toast('🛡️ اتحدّثت بيانات المستخدم', 'ok');
    },
    [people, toast]
  );

  const postAnnouncement = useCallback<AppApi['postAnnouncement']>(
    async (text) => {
      const p = profileRef.current;
      const row: Announcement = { id: uid('ann_'), text: text.trim(), at: new Date().toISOString() };
      if (!row.text) {
        toast('⚠️ اكتب نص الإعلان', 'warn');
        return;
      }
      setAnnouncement(row);
      await db.write({
        kind: 'insert',
        coll: 'announcements',
        shared: true,
        ownerId: p.id,
        id: row.id,
        row: ent(row),
      });
      toast('📢 نُشر الإعلان لكل المستخدمين', 'ok');
    },
    [toast]
  );

  const saveTip = useCallback<AppApi['saveTip']>(
    async (text) => {
      const p = profileRef.current;
      const clean = text.trim();
      setTip(clean);
      await db.write({
        kind: 'upsert',
        coll: 'settings',
        shared: true,
        ownerId: p.id,
        id: SETTINGS_TIP,
        row: { id: SETTINGS_TIP, data: { text: clean, at: new Date().toISOString() } },
      });
      toast('💡 اتحدّثت نصيحة اليوم', 'ok');
    },
    [toast]
  );

  /* ---------- auth actions ---------- */

  const signIn = useCallback<AppApi['signIn']>(
    async (email, password) => {
      if (!supabase) return;
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message);
    },
    []
  );

  const signUp = useCallback<AppApi['signUp']>(
    async (email, password) => {
      if (!supabase) return;
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw new Error(error.message);
    },
    []
  );

  const signOut = useCallback<AppApi['signOut']>(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setReady(false);
  }, []);

  /* ---------- prefs setters ---------- */

  const setTheme = useCallback<AppApi['setTheme']>((t) => {
    setThemeState(t);
    applyTheme(t);
    lsSetRaw(LS_KEYS.theme, t);
    setProfile((prev) => ({ ...prev, theme: t }));
    void db.write({
      kind: 'update',
      coll: 'profiles',
      shared: true,
      ownerId: profileRef.current.id,
      id: profileRef.current.id,
      patch: { theme: t },
    });
  }, []);

  const setSounds = useCallback<AppApi['setSounds']>((s) => {
    setSoundsState(s);
    lsSetRaw(LS_KEYS.sounds, s);
  }, []);

  const setSoundVolume = useCallback<AppApi['setSoundVolume']>((v) => {
    setSoundVolumeState(v);
    lsSetRaw(LS_KEYS.volume, v);
  }, []);

  const previewSound = useCallback<AppApi['previewSound']>((id: SoundId) => {
    playSound(id, soundVolume);
  }, [soundVolume]);

  const setNotifyOn = useCallback<AppApi['setNotifyOn']>(
    (v) => {
      void (async () => {
        if (v) {
          const perm = await requestNotifyPermission();
          if (perm !== 'granted') {
            toast('🔔 المتصفح رافض الإشعارات — افتح الإعدادات واسمح بها', 'warn');
            return;
          }
        }
        setNotifyOnState(v);
        lsSetRaw(LS_KEYS.notify, v);
        await writeProfile({ timerNotify: v });
      })();
    },
    [toast, writeProfile]
  );

  const setTimer = useCallback<AppApi['setTimer']>((patch) => {
    setTimerState((prev) => {
      const next = { ...prev, ...patch, pomo: { ...prev.pomo, ...(patch.pomo ?? {}) } };
      lsSetRaw(LS_KEYS.timer, next);
      return next;
    });
  }, []);

  /* ---------- context value ---------- */

  const value: AppApi = {
    ready,
    cloud,
    user,
    isAdmin,
    profile,
    config,
    projects,
    lists,
    tasks,
    inventory,
    logs,
    units,
    requests,
    storeItems,
    friends,
    people,
    cheers,
    announcement,
    tip,
    stats,
    sync: { online, pending, syncing },
    theme,
    setTheme,
    sounds,
    setSounds,
    soundVolume,
    setSoundVolume,
    notifyOn,
    setNotifyOn,
    previewSound,
    timer,
    setTimer,
    toasts,
    toast,
    dismissToast,
    signIn,
    signUp,
    signOut,
    addProject,
    updateProject,
    removeProject,
    addList,
    updateList,
    removeList,
    addTask,
    updateTask,
    toggleTask,
    removeTask,
    grantReward,
    commitFocus,
    buyItem,
    inventoryAction,
    suggestReward,
    saveProfile,
    uploadAvatar,
    exportBackup,
    importBackup,
    refresh,
    sendFriendRequest,
    respondFriend,
    sendCheer,
    removeFriend,
    saveConfig,
    saveUnit,
    removeUnit,
    saveStoreItem,
    removeStoreItem,
    decideRequest,
    adminUpdateUser,
    postAnnouncement,
    saveTip,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
