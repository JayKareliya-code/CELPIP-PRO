"use client";

import { useState } from "react";
import { Image as ImageIcon, Archive, FileText, Music, Video, File } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useAdminAssets, useArchiveAsset, type CmsAsset } from "@/lib/hooks/useAdminAssets";

const TYPE_ICON: Record<string, React.ElementType> = {
  image: ImageIcon,
  pdf:   FileText,
  doc:   FileText,
  audio: Music,
  video: Video,
};

function AssetCard({ asset, onArchive }: { asset: CmsAsset; onArchive: (id: string) => void }) {
  const Icon = TYPE_ICON[asset.asset_type] ?? File;
  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden flex flex-col">
      {asset.asset_type === "image" && asset.public_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.public_url}
          alt={asset.alt_text ?? asset.title}
          className="w-full h-36 object-cover"
        />
      ) : (
        <div className="w-full h-36 bg-muted flex items-center justify-center">
          <Icon className="w-10 h-10 text-subtle/50" />
        </div>
      )}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-medium truncate" title={asset.title}>{asset.title}</p>
        <p className="text-xs text-subtle">{asset.asset_type.toUpperCase()} · {asset.mime_type}</p>
        {asset.file_size_bytes && (
          <p className="text-xs text-subtle">{(asset.file_size_bytes / 1024).toFixed(1)} KB</p>
        )}
        {asset.width && asset.height && (
          <p className="text-xs text-subtle">{asset.width} × {asset.height}</p>
        )}
        <div className="mt-auto pt-2 flex gap-2">
          {asset.public_url && (
            <a
              href={asset.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View
            </a>
          )}
          {asset.status === "active" && (
            <button
              onClick={() => onArchive(asset.id)}
              className="text-xs text-gray-500 hover:underline flex items-center gap-1 ml-auto"
            >
              <Archive className="w-3 h-3" /> Archive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAssetsPage() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const { data: assets = [], isLoading } = useAdminAssets({ asset_type: typeFilter });
  const archive = useArchiveAsset();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-8 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Assets</h1>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <select
              className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
              value={typeFilter ?? ""}
              onChange={(e) => setTypeFilter(e.target.value || undefined)}
            >
              <option value="">All types</option>
              {["image", "pdf", "doc", "audio", "video", "other"].map((t) => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <p className="text-subtle">Loading assets…</p>
          ) : assets.length === 0 ? (
            <p className="text-subtle">No assets found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {assets.map((a) => (
                <AssetCard key={a.id} asset={a} onArchive={(id) => archive.mutate(id)} />
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
