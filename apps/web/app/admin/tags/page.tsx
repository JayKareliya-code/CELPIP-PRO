"use client";

import { useState } from "react";
import { Tag, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { api, API_V1, authHeaders } from "@/lib/api";

interface CmsTag { id: string; name: string; slug: string; tag_type: string; created_at: string }

const TAG_TYPES = ["topic", "difficulty", "grammar", "vocabulary", "module", "general"] as const;

function useAdminTags() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "tags"],
    queryFn: async () => {
      const token = await getToken();
      return api.get<CmsTag[]>(`${API_V1}/admin/tags`, { headers: authHeaders(token) });
    },
  });
}

function useCreateTag() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; slug: string; tag_type: string }) => {
      const token = await getToken();
      return api.post<CmsTag>(`${API_V1}/admin/tags`, payload, { headers: authHeaders(token) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tags"] }),
  });
}

function useDeleteTag() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.delete(`${API_V1}/admin/tags/${id}`, { headers: authHeaders(token) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tags"] }),
  });
}

export default function AdminTagsPage() {
  const { data: tags = [], isLoading } = useAdminTags();
  const create = useCreateTag();
  const remove = useDeleteTag();

  const [form, setForm] = useState({ name: "", slug: "", tag_type: "general" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return;
    create.mutate(form, { onSuccess: () => setForm({ name: "", slug: "", tag_type: "general" }) });
  };

  const autoSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-8 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <Tag className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Content Tags</h1>
          </div>

          {/* Create form */}
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-5 mb-8 flex gap-3 flex-wrap items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="text-xs text-subtle font-medium">Name</label>
              <input
                className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none"
                placeholder="e.g. Opinion Essay"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, slug: autoSlug(e.target.value) }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="text-xs text-subtle font-medium">Slug</label>
              <input
                className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none"
                placeholder="e.g. opinion-essay"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-subtle font-medium">Type</label>
              <select
                className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
                value={form.tag_type}
                onChange={(e) => setForm((p) => ({ ...p, tag_type: e.target.value }))}
              >
                {TAG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" /> Add Tag
            </button>
          </form>

          {/* Tag list */}
          {isLoading ? (
            <p className="text-subtle">Loading…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-full text-sm">
                  <span className="font-medium">{tag.name}</span>
                  <span className="text-xs text-subtle">· {tag.tag_type}</span>
                  <button onClick={() => remove.mutate(tag.id)} className="text-gray-400 hover:text-red-500 ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
