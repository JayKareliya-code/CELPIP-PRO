"use client";

import { useState } from "react";
import { Plus, BookOpen, CheckCircle, Archive, Search } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  useAdminMaterials,
  usePublishMaterial,
  useArchiveMaterial,
  type CmsMaterial,
} from "@/lib/hooks/useAdminMaterials";

const STATUS_BADGE: Record<string, string> = {
  draft:     "bg-yellow-100 text-yellow-800",
  published: "bg-green-100  text-green-800",
  archived:  "bg-gray-100   text-gray-600",
};

function MaterialRow({ m, onPublish, onArchive }: {
  m: CmsMaterial;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-medium text-sm">{m.title}</td>
      <td className="px-4 py-3 text-xs text-subtle">{m.module}</td>
      <td className="px-4 py-3 text-xs text-subtle">{m.material_type}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[m.status]}`}>
          {m.status}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-subtle">
        {new Date(m.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 flex gap-2">
        {m.status !== "published" && (
          <button
            onClick={() => onPublish(m.id)}
            className="text-xs text-green-700 hover:underline flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3" /> Publish
          </button>
        )}
        {m.status !== "archived" && (
          <button
            onClick={() => onArchive(m.id)}
            className="text-xs text-gray-500 hover:underline flex items-center gap-1"
          >
            <Archive className="w-3 h-3" /> Archive
          </button>
        )}
      </td>
    </tr>
  );
}

export default function AdminMaterialsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [moduleFilter, setModuleFilter] = useState<string | undefined>();

  const { data: materials = [], isLoading } = useAdminMaterials({
    status: statusFilter,
    module: moduleFilter,
    search: search || undefined,
  });
  const publish = usePublishMaterial();
  const archive = useArchiveMaterial();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-8 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Learning Materials</h1>
            </div>
            <a
              href="/admin/materials/create"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> New Material
            </a>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-subtle" />
              <input
                className="pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none"
                placeholder="Search materials…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
              value={statusFilter ?? ""}
              onChange={(e) => setStatusFilter(e.target.value || undefined)}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <select
              className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
              value={moduleFilter ?? ""}
              onChange={(e) => setModuleFilter(e.target.value || undefined)}
            >
              <option value="">All modules</option>
              <option value="speaking">Speaking</option>
              <option value="writing">Writing</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Title", "Module", "Type", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-subtle uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-subtle">Loading…</td></tr>
                ) : materials.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-subtle">No materials found.</td></tr>
                ) : (
                  materials.map((m) => (
                    <MaterialRow
                      key={m.id}
                      m={m}
                      onPublish={(id) => publish.mutate(id)}
                      onArchive={(id) => archive.mutate(id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
