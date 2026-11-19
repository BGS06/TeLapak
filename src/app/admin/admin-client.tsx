"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  RotateCcw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatIDR } from "@/lib/utils";
import {
  markPayoutPaidAction,
  moderateReportAction,
  resolveDisputeAction,
  reviewVerificationAction,
  sendTestEmailAction,
} from "@/server/actions/admin";

// 1. Aksi Verifikasi Alumni/Dosen --------------------------------------------
export function VerificationDecisionControls({ userId }: { userId: string }) {
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleDecision = (decision: "verified" | "rejected") => {
    startTransition(async () => {
      const res = await reviewVerificationAction({
        userId,
        decision,
        rejectionReason: decision === "rejected" ? reason : undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setRejectOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="whatsapp"
          size="sm"
          disabled={isPending}
          onClick={() => handleDecision("verified")}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Setujui & Hapus File Bukti
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() => setRejectOpen((v) => !v)}
        >
          <XCircle className="h-3.5 w-3.5" />
          Tolak dengan Alasan
        </Button>
      </div>

      {rejectOpen && (
        <div className="flex flex-col gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 sm:flex-row">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Foto KTM buram / nama pada bukti tidak sesuai nama akun"
            className="h-9 text-xs"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isPending || reason.trim().length < 5}
            onClick={() => handleDecision("rejected")}
          >
            Kirim Penolakan
          </Button>
        </div>
      )}
    </div>
  );
}

// 2. Aksi Putusan Sengketa ---------------------------------------------------
export function DisputeResolutionControls({
  orderId,
  buyerPaidIdr,
  sellerNetIdr,
}: {
  orderId: string;
  buyerPaidIdr: number;
  sellerNetIdr: number;
}) {
  const router = useRouter();
  const [adminNotes, setAdminNotes] = useState("");
  const [removeListing, setRemoveListing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleResolve = (resolution: "refund_buyer" | "release_seller") => {
    if (adminNotes.trim().length < 5) {
      toast.error("Tulis catatan putusan minimal 5 karakter.");
      return;
    }

    startTransition(async () => {
      const res = await resolveDisputeAction({
        orderId,
        resolution,
        adminNotes,
        removeListing,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 border-t border-[#e6e0d6] pt-3">
      <div>
        <label className="mb-1 block text-xs font-bold text-[#181512]">
          Catatan Putusan Admin (dikirim ke kedua pihak)
        </label>
        <Textarea
          rows={2}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Contoh: Berdasarkan bukti foto saat COD, barang terbukti tidak sesuai deskripsi. Dana dikembalikan ke pembeli."
          className="min-h-[72px] text-xs"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-[#57524c]">
        <input
          type="checkbox"
          checked={removeListing}
          onChange={(e) => setRemoveListing(e.target.checked)}
          className="rounded border-[#dcd5c9]"
        />
        <span>
          Jika Refund ke Pembeli, sekalian <strong>turunkan barang dari katalog</strong> (untuk
          barang bermasalah/KW).
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() => handleResolve("refund_buyer")}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Refund ke Pembeli ({formatIDR(buyerPaidIdr)})
        </Button>

        <Button
          type="button"
          variant="whatsapp"
          size="sm"
          disabled={isPending}
          onClick={() => handleResolve("release_seller")}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Cairkan ke Penjual ({formatIDR(sellerNetIdr)})
        </Button>
      </div>
    </div>
  );
}

// 3. Aksi Pencairan Dana (Payout) --------------------------------------------
export function PayoutTransferControls({
  sellerId,
  totalReadyIdr,
}: {
  sellerId: string;
  totalReadyIdr: number;
}) {
  const router = useRouter();
  const [transferReference, setTransferReference] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleMarkPaid = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await markPayoutPaidAction({
        sellerId,
        transferReference,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setTransferReference("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleMarkPaid} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        required
        minLength={3}
        value={transferReference}
        onChange={(e) => setTransferReference(e.target.value)}
        placeholder="No. referensi bukti transfer (mis. BCA-20261119-8821)"
        className="h-9 text-xs font-mono sm:w-72"
      />
      <Button type="submit" variant="whatsapp" size="sm" disabled={isPending}>
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Tandai Sudah Ditransfer ({formatIDR(totalReadyIdr)})
      </Button>
    </form>
  );
}

// 4. Aksi Moderasi Laporan ---------------------------------------------------
export function ReportModerationControls({
  reportId,
  hasListing,
}: {
  reportId: string;
  hasListing: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleAction = (action: "take_down" | "suspend_user" | "dismiss") => {
    startTransition(async () => {
      const res = await moderateReportAction({ reportId, action });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasListing && (
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() => handleAction("take_down")}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Turunkan Barang
        </Button>
      )}
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={isPending}
        onClick={() => handleAction("suspend_user")}
      >
        <Ban className="h-3.5 w-3.5" />
        Suspend Pengguna
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() => handleAction("dismiss")}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Abaikan Laporan
      </Button>
    </div>
  );
}

// 5. Tombol Uji Koneksi Resend Email ------------------------------------------
export function TestResendEmailButton({ resendReady }: { resendReady: boolean }) {
  const [isPending, startTransition] = useTransition();

  const handleTest = () => {
    startTransition(async () => {
      const res = await sendTestEmailAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
    });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={isPending || !resendReady}
      onClick={handleTest}
      title={
        resendReady
          ? "Kirim email uji coba ke akun adminmu via Resend"
          : "Isi RESEND_API_KEY di Environment Variables terlebih dahulu"
      }
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
      Uji Email Resend
    </Button>
  );
}
