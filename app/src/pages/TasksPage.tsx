import { useState } from 'react';
import { EmojiPicker } from '../components/EmojiPicker';
import { Modal } from '../components/Modal';
import { PROJECT_COLORS } from '../lib/defaults';
import { Hr, fmtEgp } from '../lib/formulas';
import type { Task } from '../lib/types';
import { useApp } from '../state/context';

export default function TasksPage() {
  const {
    projects,
    lists,
    tasks,
    units,
    stats,
    profile,
    announcement,
    tip,
    addProject,
    removeProject,
    addList,
    removeList,
    addTask,
    toggleTask,
    removeTask,
    updateTask,
  } = useApp();

  const [projectOpen, setProjectOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', emoji: '📁', color: PROJECT_COLORS[0] });

  const [listFor, setListFor] = useState<string | null>(null);
  const [listForm, setListForm] = useState({ name: '', emoji: '📋' });

  const [taskFor, setTaskFor] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: '', unitId: units[0]?.id ?? '' });

  const [editing, setEditing] = useState<Task | null>(null);

  const ordered = [...projects].sort((a, b) => a.order - b.order);

  const createProject = async () => {
    if (!projectForm.name.trim()) return;
    await addProject(projectForm);
    setProjectForm({ name: '', emoji: '📁', color: PROJECT_COLORS[0] });
    setProjectOpen(false);
  };

  const createList = async () => {
    if (!listFor || !listForm.name.trim()) return;
    await addList(listFor, listForm);
    setListForm({ name: '', emoji: '📋' });
    setListFor(null);
  };

  const createTask = async () => {
    if (!taskFor || !taskForm.title.trim()) return;
    const unit = units.find((u) => u.id === taskForm.unitId) ?? units[0];
    await addTask(taskFor, {
      title: taskForm.title,
      unitId: unit?.id ?? null,
      icon: unit?.icon ?? '✅',
    });
    setTaskForm({ title: '', unitId: units[0]?.id ?? '' });
    setTaskFor(null);
  };

  return (
    <div className="space-y-3">
      {/* stats */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="خلصت النهاردة" value={String(stats.doneToday)} icon="✅" />
        <Stat label="تركيز النهاردة" value={Hr(stats.focusToday)} icon="⏱️" />
        <Stat label="مهام الأسبوع" value={String(stats.weekTasks)} icon="🗓️" />
        <Stat label="دخل الأسبوع" value={fmtEgp(stats.weekEgp)} icon="💰" />
      </section>

      {announcement && (
        <div className="card animate-pop-in border-gold/40 bg-gold/10">
          <div className="mb-1 text-xs font-black text-gold">📢 إعلان</div>
          <div className="text-sm">{announcement.text}</div>
        </div>
      )}

      <div className="card flex items-start gap-3 border-primary/30 bg-primary/10">
        <div className="text-2xl">💡</div>
        <div>
          <div className="text-xs font-black text-primary">نصيحة اليوم</div>
          <div className="text-sm">{tip}</div>
        </div>
      </div>

      {/* header */}
      <div className="flex items-center justify-between">
        <h2 className="title">المشاريع</h2>
        <button type="button" className="btn-primary" onClick={() => setProjectOpen(true)}>
          ＋ مشروع
        </button>
      </div>

      {ordered.length === 0 && (
        <div className="card animate-pop-in text-center">
          <div className="mb-2 text-4xl">📁</div>
          <p className="text-sm text-muted">
            مفيش مشاريع لسه. ابدأ بمشروع واحد زي «دراسة» أو «رياضة» وابدأ تقسّم مهامك.
          </p>
          <button
            type="button"
            className="btn-primary mt-3"
            onClick={() => {
              setProjectForm({ name: 'دراسة', emoji: '📚', color: PROJECT_COLORS[0] });
              setProjectOpen(true);
            }}
          >
            ابدأ بسرعة
          </button>
        </div>
      )}

      {ordered.map((p) => {
        const projectLists = lists.filter((l) => l.projectId === p.id).sort((a, b) => a.order - b.order);
        const projectTasks = tasks.filter((t) => t.projectId === p.id);
        const doneCount = projectTasks.filter((t) => t.done).length;

        return (
          <section key={p.id} className="card space-y-3">
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-9 w-9 place-items-center rounded-xl text-lg"
                  style={{ background: `${p.color}22`, border: `1px solid ${p.color}66` }}
                >
                  {p.emoji}
                </span>
                <div className="leading-tight">
                  <div className="font-black">{p.name}</div>
                  <div className="muted">
                    {doneCount}/{projectTasks.length} مهمة مخلّصة
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="icon-btn"
                  title="إضافة قائمة"
                  onClick={() => {
                    setListForm({ name: '', emoji: '📋' });
                    setListFor(p.id);
                  }}
                >
                  ＋
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="حذف المشروع"
                  onClick={() => {
                    if (window.confirm(`نمسح مشروع «${p.name}» وكل قوايمه ومهامه؟`)) void removeProject(p.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            </header>

            <div className="space-y-2">
              {projectLists.map((l) => {
                const listTasks = tasks.filter((t) => t.listId === l.id);
                return (
                  <div key={l.id} className="card-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <span>{l.emoji}</span>
                        <span>{l.name}</span>
                        <span className="muted">({listTasks.length})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="icon-btn h-7 w-7 text-sm"
                          title="إضافة مهمة"
                          onClick={() => {
                            setTaskForm({ title: '', unitId: units[0]?.id ?? '' });
                            setTaskFor(l.id);
                          }}
                        >
                          ＋
                        </button>
                        <button
                          type="button"
                          className="icon-btn h-7 w-7 text-sm"
                          title="حذف القائمة"
                          onClick={() => {
                            if (window.confirm(`نمسح قائمة «${l.name}» ومهامها؟`)) void removeList(l.id);
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <ul className="space-y-1.5">
                      {listTasks.length === 0 && (
                        <li className="rounded-lg border border-dashed border-line px-3 py-2 text-center text-xs text-muted">
                          مفيش مهام هنا — اضغط ＋
                        </li>
                      )}
                      {listTasks.map((t) => (
                        <li
                          key={t.id}
                          className={`flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-2 ${
                            t.done ? 'opacity-60' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => void toggleTask(t.id)}
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-xs transition ${
                              t.done
                                ? 'border-good bg-good/20 text-good'
                                : 'border-line bg-surface2 text-transparent hover:border-primary'
                            }`}
                            aria-label={t.done ? 'إلغاء الإنجاز' : 'تم'}
                          >
                            ✓
                          </button>
                          <span className="text-lg">{t.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-sm font-bold ${t.done ? 'line-through' : ''}`}>
                              {t.title}
                            </div>
                            <div className="muted flex flex-wrap items-center gap-x-2">
                              <span>
                                {t.unitIcon} {t.unitName}
                              </span>
                              <span>· {fmtEgp(t.egp)}</span>
                              <span>· {t.xp} XP</span>
                              {t.focusMinutes > 0 && <span>· ⏱️ {Hr(t.focusMinutes)}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="icon-btn h-7 w-7 text-sm"
                            title="تعديل"
                            onClick={() => setEditing(t)}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="icon-btn h-7 w-7 text-sm"
                            title="حذف"
                            onClick={() => void removeTask(t.id)}
                          >
                            🗑️
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {projectLists.length === 0 && (
                <div className="rounded-lg border border-dashed border-line px-3 py-2 text-center text-xs text-muted">
                  مفيش قوايم — أضف قائمة وابدأ تخطّط.
                </div>
              )}
            </div>
          </section>
        );
      })}

      <div className="muted text-center">
        يا {profile.displayName}، خلّي الشغل صغير وواضح — مهمة واحدة في المرة.
      </div>

      {/* add project */}
      <Modal open={projectOpen} onClose={() => setProjectOpen(false)} title="مشروع جديد">
        <div className="space-y-3">
          <div>
            <label className="label">اسم المشروع</label>
            <input
              className="input"
              value={projectForm.name}
              onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: دراسة الجامعة"
            />
          </div>
          <div>
            <label className="label">اللون</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setProjectForm((f) => ({ ...f, color: c }))}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    projectForm.color === c ? 'border-fg scale-110' : 'border-transparent'
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="label">الأيقونة</label>
            <EmojiPicker value={projectForm.emoji} onChange={(emoji) => setProjectForm((f) => ({ ...f, emoji }))} />
          </div>
          <button type="button" className="btn-primary w-full" onClick={() => void createProject()}>
            إنشاء المشروع
          </button>
        </div>
      </Modal>

      {/* add list */}
      <Modal open={listFor !== null} onClose={() => setListFor(null)} title="قائمة جديدة">
        <div className="space-y-3">
          <div>
            <label className="label">اسم القائمة</label>
            <input
              className="input"
              value={listForm.name}
              onChange={(e) => setListForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: مذاكرة الأسبوع"
            />
          </div>
          <div>
            <label className="label">الأيقونة</label>
            <EmojiPicker value={listForm.emoji} onChange={(emoji) => setListForm((f) => ({ ...f, emoji }))} />
          </div>
          <button type="button" className="btn-primary w-full" onClick={() => void createList()}>
            إنشاء القائمة
          </button>
        </div>
      </Modal>

      {/* add task */}
      <Modal open={taskFor !== null} onClose={() => setTaskFor(null)} title="مهمة جديدة">
        <div className="space-y-3">
          <div>
            <label className="label">عنوان المهمة</label>
            <input
              className="input"
              value={taskForm.title}
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثال: حل 10 مسائل"
            />
          </div>
          <div>
            <label className="label">وحدة المكافأة</label>
            <div className="grid gap-2">
              {units.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setTaskForm((f) => ({ ...f, unitId: u.id }))}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                    taskForm.unitId === u.id ? 'border-primary bg-primary/10' : 'border-line bg-surface2'
                  }`}
                >
                  <span className="font-bold">
                    {u.icon} {u.name}
                  </span>
                  <span className="muted">
                    {fmtEgp(u.egp)} · {u.xp} XP
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn-primary w-full" onClick={() => void createTask()}>
            إضافة المهمة
          </button>
        </div>
      </Modal>

      {/* edit task */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title="تعديل المهمة">
        {editing && (
          <div className="space-y-3">
            <div>
              <label className="label">العنوان</label>
              <input
                className="input"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <label className="label">وحدة المكافأة</label>
              <div className="grid gap-2">
                {units.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() =>
                      setEditing({ ...editing, unitId: u.id, unitName: u.name, unitIcon: u.icon, egp: u.egp, xp: u.xp })
                    }
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                      editing.unitId === u.id ? 'border-primary bg-primary/10' : 'border-line bg-surface2'
                    }`}
                  >
                    <span className="font-bold">
                      {u.icon} {u.name}
                    </span>
                    <span className="muted">
                      {fmtEgp(u.egp)} · {u.xp} XP
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => {
                void updateTask(editing.id, {
                  title: editing.title,
                  unitId: editing.unitId,
                  unitName: editing.unitName,
                  unitIcon: editing.unitIcon,
                  egp: editing.egp,
                  xp: editing.xp,
                });
                setEditing(null);
              }}
            >
              حفظ التعديل
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card-2 flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <div className="leading-tight">
        <div className="text-sm font-black">{value}</div>
        <div className="muted">{label}</div>
      </div>
    </div>
  );
}
