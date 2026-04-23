"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useDeleteAccount } from "@/lib/hooks/useAccount";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const deleteAccount = useDeleteAccount();

  const [confirmText, setConfirmText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading || !user) {
    return <div className="p-8">Loading…</div>;
  }

  const canDelete = confirmText === "DELETE";

  async function handleDelete() {
    try {
      await deleteAccount.mutateAsync();
      router.push("/");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Account deletion failed", err);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
      </header>

      <section className="border border-red-300 rounded-lg p-6 bg-red-50">
        <h2 className="text-lg font-semibold text-red-800">Danger zone</h2>
        <p className="text-sm text-red-700 mt-2">
          Deleting your account permanently removes all your practice attempts,
          recordings, scoring reports, and subscription. This cannot be undone.
        </p>

        {!confirmOpen ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="mt-4 px-4 py-2 rounded bg-red-600 text-white text-sm"
          >
            Delete my account
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-red-800">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border border-red-400 rounded px-3 py-2 text-sm"
              placeholder="DELETE"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || deleteAccount.isPending}
                className="px-4 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50"
              >
                {deleteAccount.isPending ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmText("");
                }}
                className="px-4 py-2 rounded border border-gray-300 text-sm"
              >
                Cancel
              </button>
            </div>
            {deleteAccount.isError && (
              <p className="text-sm text-red-700">
                Failed to delete: {String(deleteAccount.error)}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
