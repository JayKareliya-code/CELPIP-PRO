"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { api, API_V1, authHeaders } from "@/lib/api";

interface AuditLog {
  id: string;
  admin_user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  new_value_json: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_COLOR: Record<string, string> = {
  create:  "bg-green-100 text-green-800",
  update:  "bg-blue-100  text-blue-800",
  publish: "bg-purple-100 text-purple-800",
  archive: "bg-gray-100   text-gray-600",
  delete:  "bg-red-100    text-red-700",
};

function useAuditLogs(filters: { entity_type?: string; action_type?: string }) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "audit", filters],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (filters.entity_type) params.set("entity_type", filters.entity_type);
      if (filters.action_type) params.set("action_type", filters.action_type);
      params.set("limit", "100");
      return api.get<AuditLog[]>(`${API_V1}/admin/audit?${params}`, {
        headers: authHeaders(token),
      });
    },
  });
}

export default function AdminAuditPage() {
  const [entityType, setEntityType] = useState("");
  const [actionType, setActionType] = useState("");

  const { data: logs = [], isLoading } = useAuditLogs({
    entity_type: entityType || undefined,
    action_type: actionType || undefined,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-8 overflow-auto">
          <div className="flex items-center gap-3 mb-6">
            <ClipboardList className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Audit Log</h1>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <select
              className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="">All entity types</option>
              <option value="speaking_prompt">Speaking Prompt</option>
              <option value="writing_prompt">Writing Prompt</option>
              <option value="learning_material">Learning Material</option>
              <option value="content_asset">Asset</option>
            </select>
            <select
              className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
            >
              <option value="">All actions</option>
              {["create", "update", "publish", "archive", "delete"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Time", "Action", "Entity Type", "Entity ID", "Admin"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-subtle uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-subtle">Loading…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-subtle">No audit logs found.</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-subtle whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOR[log.action_type] ?? "bg-gray-100 text-gray-600"}`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{log.entity_type}</td>
                      <td className="px-4 py-3 text-xs text-subtle font-mono truncate max-w-[140px]">
                        {log.entity_id ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-subtle font-mono truncate max-w-[120px]">
                        {log.admin_user_id ?? "—"}
                      </td>
                    </tr>
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
