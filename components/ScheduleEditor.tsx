"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Trash2, Upload, Plus, ImageIcon, Calendar, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleSlot, Weekday } from "@/types";

const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  slots: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
}

const COLORS = [
  "bg-accent/25 border-accent/60 text-accent-glow",
  "bg-fuchsia-500/20 border-fuchsia-500/60 text-fuchsia-200",
  "bg-emerald-500/20 border-emerald-500/60 text-emerald-200",
  "bg-amber-500/20 border-amber-500/60 text-amber-200",
  "bg-sky-500/20 border-sky-500/60 text-sky-200",
  "bg-rose-500/20 border-rose-500/60 text-rose-200",
];

function colorFor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function timeLabel(h: number): string {
  const hour = ((h + 11) % 12) + 1;
  const ampm = h >= 12 && h < 24 ? "pm" : "am";
  return `${hour}${ampm}`;
}

export function ScheduleEditor({ slots, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScheduleSlot>({
    day: "Mon",
    startHour: 9,
    endHour: 10,
    label: "",
  });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const startHour = useMemo(() => {
    const lo = Math.min(...slots.map((s) => s.startHour), 8);
    return Math.max(0, Math.min(lo, 8));
  }, [slots]);
  const endHour = useMemo(() => {
    const hi = Math.max(...slots.map((s) => s.endHour), 17);
    return Math.min(24, Math.max(hi, 17));
  }, [slots]);
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = startHour; h <= endHour; h++) arr.push(h);
    return arr;
  }, [startHour, endHour]);

  async function handleUpload(file: File) {
    setErrorMsg(null);
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please choose an image file.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setErrorMsg("Image is too large. Please use one under 6 MB.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const r = await fetch("/api/schedule/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErrorMsg(data.message || data.error || "Could not extract schedule.");
        return;
      }
      const extracted: ScheduleSlot[] = data.slots || [];
      if (extracted.length === 0) {
        setErrorMsg("No classes detected. Try a clearer image or add manually.");
        return;
      }
      // Merge: replace existing schedule with extracted (user can still edit)
      onChange(extracted);
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addSlot() {
    setErrorMsg(null);
    const label = (draft.label || "").trim();
    if (!label) {
      setErrorMsg("Give the class a label.");
      return;
    }
    if (draft.endHour <= draft.startHour) {
      setErrorMsg("End time must be after start time.");
      return;
    }
    onChange([...slots, { ...draft, label }]);
    setDraft({ day: draft.day, startHour: draft.startHour, endHour: draft.endHour, label: "" });
  }

  function updateSlot(i: number, next: ScheduleSlot) {
    const copy = slots.slice();
    copy[i] = next;
    onChange(copy);
  }

  function removeSlot(i: number) {
    const copy = slots.slice();
    copy.splice(i, 1);
    onChange(copy);
  }

  return (
    <div className="space-y-5">
      {/* Image upload */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-slate-800">Upload your schedule image</h3>
        </div>
        <p className="text-xs text-muted">
          Drop a screenshot of your school timetable. The AI reads day + time + class name. Powered by OpenAI Vision. You can edit anything it gets wrong.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="btn-primary text-xs"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploading ? "Reading schedule…" : "Upload schedule image"}
          </button>
          {slots.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="btn-ghost text-xs"
              disabled={uploading}
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </div>
        {errorMsg && (
          <p className="text-xs text-danger">{errorMsg}</p>
        )}
      </div>

      {/* Manual add */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-slate-800">Add a class manually</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
          <div>
            <div className="label mb-1">Day</div>
            <select
              className="input"
              value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: e.target.value as Weekday })}
            >
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">Start</div>
            <select
              className="input"
              value={draft.startHour}
              onChange={(e) => setDraft({ ...draft, startHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <option key={h} value={h}>
                  {timeLabel(h)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">End</div>
            <select
              className="input"
              value={draft.endHour}
              onChange={(e) => setDraft({ ...draft, endHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {timeLabel(h)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-2">
            <div className="label mb-1">Class name</div>
            <input
              className="input"
              placeholder="e.g. Human-Centred AI"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSlot();
                }
              }}
            />
          </div>
        </div>
        <button type="button" onClick={addSlot} className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5" /> Add class
        </button>
      </div>

      {/* List + Preview */}
      {slots.length === 0 ? (
        <div className="card p-6 text-center">
          <Calendar className="w-5 h-5 text-accent mx-auto mb-2" />
          <p className="text-sm text-muted-strong">No classes yet. Upload a screenshot or add them manually above.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Class list ({slots.length})</h3>
            <div className="divide-y divide-border">
              {slots.map((s, i) => (
                <SlotRow
                  key={i}
                  slot={s}
                  editing={editingIdx === i}
                  onEdit={() => setEditingIdx(i)}
                  onCancel={() => setEditingIdx(null)}
                  onSave={(next) => {
                    updateSlot(i, next);
                    setEditingIdx(null);
                  }}
                  onRemove={() => removeSlot(i)}
                />
              ))}
            </div>
          </div>

          <div className="card p-4 space-y-2 overflow-x-auto">
            <h3 className="text-sm font-semibold text-slate-800">Week preview</h3>
            <WeekGrid slots={slots} hours={hours} />
          </div>
        </div>
      )}
    </div>
  );
}

function SlotRow({
  slot,
  editing,
  onEdit,
  onCancel,
  onSave,
  onRemove,
}: {
  slot: ScheduleSlot;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (next: ScheduleSlot) => void;
  onRemove: () => void;
}) {
  const [local, setLocal] = useState<ScheduleSlot>(slot);

  if (editing) {
    return (
      <div className="py-2 grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
        <select
          className="input text-xs"
          value={local.day}
          onChange={(e) => setLocal({ ...local, day: e.target.value as Weekday })}
        >
          {WEEKDAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className="input text-xs"
          value={local.startHour}
          onChange={(e) => setLocal({ ...local, startHour: Number(e.target.value) })}
        >
          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
            <option key={h} value={h}>
              {timeLabel(h)}
            </option>
          ))}
        </select>
        <select
          className="input text-xs"
          value={local.endHour}
          onChange={(e) => setLocal({ ...local, endHour: Number(e.target.value) })}
        >
          {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>
              {timeLabel(h)}
            </option>
          ))}
        </select>
        <input
          className="input text-xs col-span-2 sm:col-span-1"
          value={local.label}
          onChange={(e) => setLocal({ ...local, label: e.target.value })}
        />
        <div className="flex gap-1 col-span-2 sm:col-span-1 justify-end">
          <button onClick={() => onSave(local)} className="btn-primary text-xs px-2 py-1">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={onCancel} className="btn-ghost text-xs px-2 py-1">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 flex items-center gap-3 text-sm">
      <span className="badge w-12 justify-center">{slot.day}</span>
      <span className="text-muted text-xs w-24">
        {timeLabel(slot.startHour)} – {timeLabel(slot.endHour)}
      </span>
      <span className="flex-1 truncate text-muted-strong">{slot.label}</span>
      <button onClick={onEdit} className="btn-ghost text-xs px-2 py-1" title="Edit">
        <Pencil className="w-3 h-3" />
      </button>
      <button onClick={onRemove} className="btn-danger text-xs px-2 py-1" title="Remove">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function WeekGrid({ slots, hours }: { slots: ScheduleSlot[]; hours: number[] }) {
  const rowHeight = 28; // px per hour
  const totalHeight = (hours.length - 1) * rowHeight;
  return (
    <div className="min-w-[640px]">
      <div className="grid" style={{ gridTemplateColumns: `48px repeat(7, minmax(0, 1fr))` }}>
        <div></div>
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[11px] text-muted text-center py-1 border-b border-border">
            {d}
          </div>
        ))}
      </div>
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `48px repeat(7, minmax(0, 1fr))`,
          height: `${totalHeight}px`,
        }}
      >
        {/* Hour labels */}
        <div className="relative">
          {hours.slice(0, -1).map((h, i) => (
            <div
              key={h}
              className="absolute right-1 text-[10px] text-muted"
              style={{ top: `${i * rowHeight - 6}px` }}
            >
              {timeLabel(h)}
            </div>
          ))}
        </div>
        {/* Day columns */}
        {WEEKDAYS.map((d) => (
          <div key={d} className="relative border-l border-border">
            {hours.slice(0, -1).map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-b border-border/40"
                style={{ top: `${i * rowHeight}px`, height: `${rowHeight}px` }}
              />
            ))}
            {slots
              .filter((s) => s.day === d)
              .map((s, i) => {
                const top = (s.startHour - hours[0]) * rowHeight;
                const height = Math.max(20, (s.endHour - s.startHour) * rowHeight - 2);
                const label = s.label || "Class";
                return (
                  <div
                    key={i}
                    className={cn(
                      "absolute left-0.5 right-0.5 rounded-md border px-1.5 py-0.5 text-[10px] leading-tight overflow-hidden",
                      colorFor(label),
                    )}
                    style={{ top: `${top}px`, height: `${height}px` }}
                    title={`${label} · ${timeLabel(s.startHour)}–${timeLabel(s.endHour)}`}
                  >
                    <div className="font-semibold truncate">{label}</div>
                    <div className="opacity-80">
                      {timeLabel(s.startHour)}–{timeLabel(s.endHour)}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
