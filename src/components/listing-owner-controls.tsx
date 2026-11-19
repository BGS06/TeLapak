"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteMyListingAction, toggleListingVisibilityAction } from "@/server/actions/listings";
import type { Enums } from "@/types/database";

export function ListingOwnerControls({
  listingId,
  status,
  compact = false,
  redirectAfterDelete,
}: {
  listingId: string;
  status: Enums<"listing_status">;
  compact?: boolean;
  redirectAfterDelete?: string;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isArchived = status === "removed";

  const handleToggleArchive = () => {
    startTransition(async () => {
      const nextStatus = isArchived ? "active" : "removed";
      const res = await toggleListingVisibilityAction(listingId, nextStatus);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteMyListingAction(listingId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setConfirmDelete(false);
      if (redirectAfterDelete) {
        router.push(redirectAfterDelete);
      }
      router.refresh();
    });
  };

  if (compact) {
    return (
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={isPending}
          onClick={handleToggleArchive}
          className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md border border-[#d9dfdf] bg-white px-2 text-[11px] font-medium text-[#666666] transition hover:bg-[#f2f4f4] hover:text-[#171717] disabled:opacity-50"
          title={isArchived ? "Tampilkan kembali di katalog" : "Arsipkan dari katalog"}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isArchived ? (
            <ArchiveRestore className="h-3 w-3 text-[#146c43]" />
          ) : (
            <Archive className="h-3 w-3" />
          )}
          <span>{isArchived ? "Aktifkan" : "Arsipkan"}</span>
        </button>

        {confirmDelete ? (
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md bg-[#b3261e] px-2 text-[11px] font-bold text-white transition hover:bg-[#8f1c15] disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yakin?"}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmDelete(true)}
            className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md border border-[#f8c9c6] bg-[#fdf2f2]/60 px-2 text-[11px] font-medium text-[#b3261e] transition hover:bg-[#fdf2f2] disabled:opacity-50"
            title="Hapus barang"
          >
            <Trash2 className="h-3 w-3" />
            <span>Hapus</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#edf2f2] bg-[#f2f4f4]/60 p-4">
      <div>
        <h3 className="text-xs font-bold text-[#171717]">Status Tayang & Pengelolaan</h3>
        <p className="mt-0.5 text-[11px] text-[#666666]">
          {isArchived
            ? "Barang ini sedang diarsipkan dan tersembunyi dari katalog kampus."
            : "Arsipkan sementara jika belum ingin dijual, atau hapus permanen jika tidak jadi dijual."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={handleToggleArchive}
        >
          {isArchived ? (
            <>
              <ArchiveRestore className="h-3.5 w-3.5 text-[#146c43]" />
              Tampilkan Kembali
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5" />
              Arsipkan Barang
            </>
          )}
        </Button>

        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ya, Hapus"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => setConfirmDelete(false)}
            >
              Batal
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus Barang
          </Button>
        )}
      </div>
    </div>
  );
}
