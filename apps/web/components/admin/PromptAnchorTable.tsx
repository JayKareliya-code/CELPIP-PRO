// ─────────────────────────────────────────────────────────────────────────────
// components/admin/PromptAnchorTable.tsx
//
// Unified calibration management table — shows ALL speaking + writing prompts
// with their Band 12 anchor status.
//
// "Add / Edit Anchor" opens the SAME full PromptFormModal used on the task
// management pages (pre-populated with all prompt data). The Band 12 field is
// inside that form via SharedFormFields, so admins see the full question context
// while editing the anchor.
//
// Save uses useUpdateSpeakingPrompt / useUpdateWritingPrompt — identical to the
// mutations called from AdminSpeakingTaskDetail / AdminWritingTaskDetail.
// No pipeline or DB risk.
//
// "Clear" removes only the anchor via a focused PATCH (same as before).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useMemo, useCallback }          from "react";
import { toast }                                   from "sonner";
import { Pencil, Trash2, Search, SlidersHorizontal } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmModal }                            from "@/components/common/ConfirmModal";
import { PromptFormModal }                         from "@/components/admin/PromptFormModal";
import { StatChip }                                from "@/components/admin/shared/StatChip";
import { inputCls }                                from "@/components/admin/shared/inputCls";
import { cn }                                      from "@/lib/utils";
import {
  useAdminSpeakingPrompts,
  useAdminWritingPrompts,
  useUpdateSpeakingPrompt,
  useUpdateWritingPrompt,
  BASE_KEYS,
}                                                  from "@/lib/hooks/useAdminPrompts";
import { useQueryClient }                          from "@tanstack/react-query";
import { useAuth }                                 from "@clerk/nextjs";
import { patchSpeakingPromptAnchor, patchWritingPromptAnchor } from "@/lib/admin/calibrationApi";
import { buildSpeakingPayload, buildWritingPayload }            from "@/lib/admin/promptPayloads";
import type { SpeakingPrompt, WritingPrompt }      from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PromptRow {
  id:          string;
  skill:       "speaking" | "writing";
  task_number: number;
  title:       string;
  status:      string;
  is_active:   boolean;
  anchor:      string;    // empty string = no anchor
}

type SkillFilter  = "all" | "speaking" | "writing";
type AnchorFilter = "all" | "anchored" | "missing";

// ── Pure helpers ──────────────────────────────────────────────────────────────

function getAnchor(p: SpeakingPrompt | WritingPrompt): string {
  const r = p as unknown as Record<string, unknown>;
  return String(r.sample_response_text ?? r.sample_response_band12 ?? "").trim();
}

function toRows(speaking: SpeakingPrompt[], writing: WritingPrompt[]): PromptRow[] {
  const s: PromptRow[] = speaking.map((p) => ({
    id:          p.id,
    skill:       "speaking",
    task_number: p.task_number,
    title:       p.title,
    status:      p.status ?? "draft",
    is_active:   p.is_active,
    anchor:      getAnchor(p),
  }));
  const w: PromptRow[] = writing.map((p) => ({
    id:          p.id,
    skill:       "writing",
    task_number: p.task_number,
    title:       p.title,
    status:      p.status ?? "draft",
    is_active:   p.is_active,
    anchor:      getAnchor(p),
  }));
  return [...s, ...w].sort((a, b) => {
    if (a.skill !== b.skill) return a.skill === "speaking" ? -1 : 1;
    return a.task_number - b.task_number || a.title.localeCompare(b.title);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PromptAnchorTable() {
  const qc           = useQueryClient();
  const { getToken } = useAuth();

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: speaking = [], isLoading: spLoading, isError: spError } =
    useAdminSpeakingPrompts();
  const { data: writing = [], isLoading: wrLoading, isError: wrError } =
    useAdminWritingPrompts();

  const isLoading = spLoading || wrLoading;
  const isError   = spError   || wrError;

  // ── Mutations (same hooks as the task detail pages) ────────────────────────
  const updateSpeaking = useUpdateSpeakingPrompt();
  const updateWriting  = useUpdateWritingPrompt();
  const isSaving       = updateSpeaking.isPending || updateWriting.isPending;

  // ── Filter state ───────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [skillFilter,  setSkillFilter]  = useState<SkillFilter>("all");
  const [anchorFilter, setAnchorFilter] = useState<AnchorFilter>("all");

  // ── Modal state ────────────────────────────────────────────────────────────
  //  editTarget: the FULL prompt object (needed by PromptFormModal)
  const [editTarget,  setEditTarget]  = useState<SpeakingPrompt | WritingPrompt | null>(null);
  const [editSkill,   setEditSkill]   = useState<"speaking" | "writing">("speaking");
  const [clearTarget, setClearTarget] = useState<PromptRow | null>(null);
  const [isClearing,  setIsClearing]  = useState(false);

  // ── Derived rows ───────────────────────────────────────────────────────────
  const rawRows = useMemo(() => toRows(speaking, writing), [speaking, writing]);
  const rows    = useMemo(() => rawRows, [rawRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (skillFilter  !== "all" && r.skill !== skillFilter)  return false;
      if (anchorFilter === "anchored" && !r.anchor)           return false;
      if (anchorFilter === "missing"  &&  r.anchor)           return false;
      if (q && !r.title.toLowerCase().includes(q) &&
          !String(r.task_number).includes(q))                 return false;
      return true;
    });
  }, [rows, search, skillFilter, anchorFilter]);

  const anchoredCount = rows.filter((r) => r.anchor).length;
  const missingCount  = rows.filter((r) => !r.anchor).length;

  // ── Open full PromptFormModal for a row ────────────────────────────────────
  const openEdit = useCallback((row: PromptRow) => {
    if (row.skill === "speaking") {
      const full = speaking.find((p) => p.id === row.id);
      if (full) { setEditSkill("speaking"); setEditTarget(full); }
    } else {
      const full = writing.find((p) => p.id === row.id);
      if (full) { setEditSkill("writing"); setEditTarget(full); }
    }
  }, [speaking, writing]);

  const closeModal = useCallback(() => setEditTarget(null), []);

  // ── Save from PromptFormModal (full update — same as task detail pages) ────
  const handleSave = useCallback((data: FormData) => {
    if (!editTarget) return;
    // task_number is hidden when lockedTaskNumber is passed — read from the
    // form field if visible, otherwise fall back to the prompt object.
    const taskNumber =
      Number(data.get("task_number")) || editTarget.task_number;

    if (editSkill === "speaking") {
      const payload = buildSpeakingPayload(data, taskNumber);
      updateSpeaking.mutate(
        { id: editTarget.id, payload },
        {
          onSuccess: () => {
            toast.success("Prompt saved.");
            closeModal();
          },
          onError: () => toast.error("Failed to save prompt."),
        },
      );
    } else {
      const payload = buildWritingPayload(data, taskNumber);
      updateWriting.mutate(
        { id: editTarget.id, payload },
        {
          onSuccess: () => {
            toast.success("Prompt saved.");
            closeModal();
          },
          onError: () => toast.error("Failed to save prompt."),
        },
      );
    }
  }, [editTarget, editSkill, updateSpeaking, updateWriting, closeModal]);

  // ── Clear anchor (focused PATCH — does not touch any other field) ─────────
  const handleClearConfirmed = useCallback(async () => {
    if (!clearTarget) return;
    setIsClearing(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      if (clearTarget.skill === "speaking") {
        await patchSpeakingPromptAnchor(clearTarget.id, null, token);
        qc.invalidateQueries({ queryKey: BASE_KEYS.adminSpeaking });
      } else {
        await patchWritingPromptAnchor(clearTarget.id, null, token);
        qc.invalidateQueries({ queryKey: BASE_KEYS.adminWriting });
      }
      toast.success("Anchor cleared.");
    } catch {
      toast.error("Failed to clear anchor.");
    } finally {
      setIsClearing(false);
      setClearTarget(null);
    }
  }, [clearTarget, getToken, qc]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-subtle text-sm gap-2">
        <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading prompts…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-center text-sm text-danger">
        Failed to load prompts. Check your connection and try refreshing.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatChip
          label="Total"
          value={rows.length}
          onClick={() => setAnchorFilter("all")}
          active={anchorFilter === "all"}
          variant="neutral"
        />
        <StatChip
          label="Anchored"
          value={anchoredCount}
          onClick={() => setAnchorFilter(anchorFilter === "anchored" ? "all" : "anchored")}
          active={anchorFilter === "anchored"}
          variant="success"
        />
        <StatChip
          label="No Anchor"
          value={missingCount}
          onClick={() => setAnchorFilter(anchorFilter === "missing" ? "all" : "missing")}
          active={anchorFilter === "missing"}
          variant="warn"
        />
      </div>

      {/* ── Filter row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle pointer-events-none" />
          <input
            id="anchor-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or task number…"
            className={cn(inputCls, "pl-8 py-1.5 text-sm")}
          />
        </div>

        <SegmentedToggle<SkillFilter>
          options={["all", "speaking", "writing"]}
          value={skillFilter}
          onChange={setSkillFilter}
          capitalize
        />

        <SegmentedToggle<AnchorFilter>
          options={[
            { value: "all",      label: "All" },
            { value: "anchored", label: "Anchored" },
            { value: "missing",  label: "No Anchor" },
          ]}
          value={anchorFilter}
          onChange={(v) => setAnchorFilter(v)}
        />

        <SlidersHorizontal className="w-4 h-4 text-subtle shrink-0" />
        <span className="text-xs text-subtle shrink-0">{filtered.length} shown</span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-subtle">
          No prompts match the current filters.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-card bg-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-24">Skill</TableHead>
                <TableHead className="w-16 text-center">Task</TableHead>
                <TableHead>Prompt Title</TableHead>
                <TableHead className="w-24 hidden sm:table-cell text-center">Status</TableHead>
                <TableHead className="w-28 text-center">Anchor</TableHead>
                <TableHead className="w-36 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <AnchorTableRow
                  key={`${row.skill}-${row.id}`}
                  row={row}
                  onEdit={() => openEdit(row)}
                  onClear={() => setClearTarget(row)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Full prompt edit modal ─────────────────────────────────────────── */}
      <PromptFormModal
        open={Boolean(editTarget)}
        skill={editSkill}
        initialPrompt={editTarget ?? undefined}
        onClose={closeModal}
        onSave={handleSave}
        isSaving={isSaving}
        lockedTaskNumber={editTarget?.task_number}
      />

      {/* ── Clear anchor confirm ────────────────────────────────────────────── */}
      <ConfirmModal
        open={Boolean(clearTarget)}
        title="Clear calibration anchor?"
        description={`Remove the Band 12 anchor from "${clearTarget?.title ?? ""}"? Scoring will fall back to the global calibration pool.`}
        confirmLabel={isClearing ? "Clearing…" : "Clear Anchor"}
        isDestructive
        onCancel={() => setClearTarget(null)}
        onConfirm={handleClearConfirmed}
      />
    </div>
  );
}

// ── AnchorTableRow ────────────────────────────────────────────────────────────

function AnchorTableRow({
  row,
  onEdit,
  onClear,
}: {
  row:     PromptRow;
  onEdit:  () => void;
  onClear: () => void;
}) {
  const hasAnchor = row.anchor.length > 0;

  return (
    <TableRow className="group hover:bg-muted/50">
      <TableCell>
        <span className={cn(
          "inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border",
          row.skill === "speaking"
            ? "bg-blue-900/30 border-blue-700/40 text-blue-300"
            : "bg-violet-900/30 border-violet-700/40 text-violet-300",
        )}>
          {row.skill === "speaking" ? "Speaking" : "Writing"}
        </span>
      </TableCell>

      <TableCell className="text-center text-sm font-semibold text-foreground">
        {row.skill === "speaking" && row.task_number === 0 ? "P" : row.task_number}
      </TableCell>

      <TableCell className="text-sm text-foreground max-w-xs">
        <div className="truncate" title={row.title}>{row.title}</div>
      </TableCell>

      <TableCell className="text-center hidden sm:table-cell">
        <span className={cn(
          "inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border",
          row.status === "published"
            ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-300"
            : row.status === "archived"
              ? "bg-red-900/20 border-red-700/30 text-red-400"
              : "bg-muted border-border text-subtle",
        )}>
          {row.status}
        </span>
      </TableCell>

      <TableCell className="text-center">
        {hasAnchor ? (
          <span
            title={row.anchor.slice(0, 160) + (row.anchor.length > 160 ? "…" : "")}
            className="inline-flex items-center px-2 py-0.5 rounded-full
                       text-[11px] font-semibold cursor-default
                       bg-primary/10 border border-primary/20 text-primary"
          >
            Anchored
          </span>
        ) : (
          <span className="text-xs text-subtle">—</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            title={hasAnchor ? "Edit prompt (incl. anchor)" : "Add Band 12 anchor"}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
              hasAnchor
                ? "border border-border text-subtle hover:text-primary hover:border-primary/50 hover:bg-primary/8"
                : "bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white",
            )}
          >
            <Pencil className="w-3 h-3 shrink-0" />
            {hasAnchor ? "Edit" : "Add"}
          </button>

          {hasAnchor && (
            <button
              type="button"
              onClick={onClear}
              title="Clear anchor"
              className="p-1.5 rounded-md text-subtle hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── SegmentedToggle ────────────────────────────────────────────────────────────

function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  capitalize = false,
}: {
  options:     T[] | { value: T; label: string }[];
  value:       T;
  onChange:    (v: T) => void;
  capitalize?: boolean;
}) {
  const items = options.map((o) =>
    typeof o === "string"
      ? { value: o, label: capitalize ? o.charAt(0).toUpperCase() + o.slice(1) : o }
      : o,
  );

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 shrink-0">
      {items.map(({ value: v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "px-3 py-1 rounded-md text-xs font-semibold transition-all",
            value === v
              ? "bg-primary text-white shadow-sm"
              : "text-subtle hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
