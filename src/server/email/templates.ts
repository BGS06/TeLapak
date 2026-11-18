import "server-only";
import { BUSINESS } from "@/config/business";
import { publicEnv } from "@/lib/env";
import { formatDateTime, formatIDR, orderCode } from "@/lib/utils";
import type { EmailMessage } from "./send";

/**
 * Template email transaksional (PRD §9 — Format Notifikasi Email Wajib).
 * Sengaja polos & berbasis tabel agar tampil konsisten di Gmail/Outlook.
 * Catatan kepatuhan: jangan gunakan kata "escrow" — pakai "Dana Ditahan Sementara".
 */

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Row = [label: string, value: string];

function layout(opts: { heading: string; intro: string; rows?: Row[]; body?: string; cta?: { label: string; url: string } }) {
  const rows = (opts.rows ?? [])
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#6b6460;font-size:14px;width:42%;vertical-align:top">${escape(label)}</td>
          <td style="padding:8px 0;color:#1f1b18;font-size:14px;font-weight:600">${escape(value)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="id">
  <body style="margin:0;background:#f6f4f1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #ebe6e1">
          <tr><td style="padding:28px 28px 0">
            <div style="font-size:18px;font-weight:800;color:#b3261e;letter-spacing:-0.02em">${BUSINESS.productName}</div>
            <h1 style="margin:20px 0 8px;font-size:20px;line-height:1.3;color:#1f1b18">${escape(opts.heading)}</h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3d3733">${escape(opts.intro)}</p>
          </td></tr>
          ${opts.rows?.length ? `<tr><td style="padding:0 28px"><table role="presentation" width="100%" style="border-top:1px solid #ebe6e1;border-bottom:1px solid #ebe6e1">${rows}</table></td></tr>` : ""}
          ${opts.body ? `<tr><td style="padding:16px 28px 0;font-size:14px;line-height:1.6;color:#3d3733">${opts.body}</td></tr>` : ""}
          ${
            opts.cta
              ? `<tr><td style="padding:24px 28px 0"><a href="${opts.cta.url}" style="display:inline-block;background:#b3261e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">${escape(opts.cta.label)}</a></td></tr>`
              : ""
          }
          <tr><td style="padding:28px;font-size:12px;line-height:1.5;color:#8a827c">
            Email ini dikirim otomatis oleh ${BUSINESS.productName}. Jangan bagikan kode pembayaran atau data rekening kepada siapa pun.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function plain(heading: string, intro: string, rows: Row[] = [], extra = "", url?: string) {
  const lines = [heading, "", intro, "", ...rows.map(([l, v]) => `${l}: ${v}`)];
  if (extra) lines.push("", extra);
  if (url) lines.push("", url);
  return lines.join("\n");
}

const orderUrl = (orderId: string) => `${publicEnv.siteUrl}/orders/${orderId}`;

export interface OrderEmailContext {
  orderId: string;
  itemTitle: string;
  itemPriceIdr: number;
  totalPaidIdr: number;
  sellerNetIdr: number;
  meetingPoint: string;
  meetingPointNote: string | null;
  autoReleaseAt: string | null;
}

// 1. Pembayaran diterima ----------------------------------------------------

export function paymentReceivedBuyer(ctx: OrderEmailContext): Omit<EmailMessage, "to"> {
  const heading = "Pembayaran diterima — dana ditahan sementara";
  const intro =
    "Pembayaranmu sudah kami terima dan ditahan sementara di platform. Dana baru diteruskan ke penjual setelah kamu menerima barang.";
  const rows: Row[] = [
    ["Nomor pesanan", orderCode(ctx.orderId)],
    ["Barang", ctx.itemTitle],
    ["Nominal ditahan", formatIDR(ctx.totalPaidIdr)],
    ["Titik temu", ctx.meetingPoint + (ctx.meetingPointNote ? ` (${ctx.meetingPointNote})` : "")],
  ];
  const extra =
    "Langkah berikutnya: buka halaman pesanan, tekan “Chat Penjual via WhatsApp” untuk janjian bertemu, lalu tekan “Barang Diterima” setelah serah terima.";
  return {
    subject: `[${orderCode(ctx.orderId)}] Pembayaran diterima — hubungi penjual via WhatsApp`,
    html: layout({ heading, intro, rows, body: escape(extra), cta: { label: "Buka pesanan", url: orderUrl(ctx.orderId) } }),
    text: plain(heading, intro, rows, extra, orderUrl(ctx.orderId)),
  };
}

export function paymentReceivedSeller(ctx: OrderEmailContext): Omit<EmailMessage, "to"> {
  const heading = "Barangmu terjual — pembeli akan menghubungimu";
  const intro =
    "Pembeli sudah membayar dan dana ditahan sementara di platform. Pembeli akan menghubungimu via WhatsApp untuk janjian di titik temu.";
  const rows: Row[] = [
    ["Nomor pesanan", orderCode(ctx.orderId)],
    ["Barang", ctx.itemTitle],
    ["Nominal ditahan", formatIDR(ctx.itemPriceIdr)],
    ["Kamu akan menerima", formatIDR(ctx.sellerNetIdr)],
    ["Titik temu", ctx.meetingPoint + (ctx.meetingPointNote ? ` (${ctx.meetingPointNote})` : "")],
  ];
  const extra = `Pastikan WhatsApp-mu aktif. Dana diteruskan setelah pembeli menekan “Barang Diterima”, atau otomatis ${BUSINESS.autoReleaseHours} jam setelah pembayaran bila tidak ada laporan masalah.`;
  return {
    subject: `[${orderCode(ctx.orderId)}] Pembayaran diterima untuk “${ctx.itemTitle}”`,
    html: layout({ heading, intro, rows, body: escape(extra), cta: { label: "Lihat pesanan", url: orderUrl(ctx.orderId) } }),
    text: plain(heading, intro, rows, extra, orderUrl(ctx.orderId)),
  };
}

// 2. Pengingat konfirmasi H+2 ------------------------------------------------

export function confirmationReminder(ctx: OrderEmailContext): Omit<EmailMessage, "to"> {
  const heading = "Sudah terima barangnya?";
  const intro = `Dana untuk pesanan ini akan otomatis diteruskan ke penjual dalam ${BUSINESS.reminderBeforeReleaseHours} jam jika kamu tidak menekan “Barang Diterima” atau “Laporkan Masalah”.`;
  const rows: Row[] = [
    ["Nomor pesanan", orderCode(ctx.orderId)],
    ["Barang", ctx.itemTitle],
    ["Diteruskan otomatis", ctx.autoReleaseAt ? formatDateTime(ctx.autoReleaseAt) : "-"],
  ];
  return {
    subject: `[${orderCode(ctx.orderId)}] Pengingat: konfirmasi penerimaan barang`,
    html: layout({ heading, intro, rows, cta: { label: "Konfirmasi sekarang", url: orderUrl(ctx.orderId) } }),
    text: plain(heading, intro, rows, "", orderUrl(ctx.orderId)),
  };
}

// 3. Sengketa dibuka -----------------------------------------------------------

export function disputeOpened(ctx: OrderEmailContext & { reason: string }, audience: "buyer" | "seller" | "admin") {
  const heading = "Laporan masalah dibuka — pencairan ditahan";
  const intro =
    audience === "admin"
      ? "Ada sengketa baru yang perlu ditinjau di panel admin."
      : "Pembeli melaporkan masalah pada pesanan ini. Pencairan dana ditahan sementara sampai admin meninjau bukti dari kedua pihak.";
  const rows: Row[] = [
    ["Nomor pesanan", orderCode(ctx.orderId)],
    ["Barang", ctx.itemTitle],
    ["Nominal", formatIDR(ctx.totalPaidIdr)],
    ["Alasan", ctx.reason],
  ];
  const extra =
    audience === "seller"
      ? "Kamu bisa menambahkan foto bukti (mis. foto barang saat serah terima) di halaman pesanan."
      : audience === "buyer"
        ? "Tambahkan foto bukti pendukung di halaman pesanan bila ada. Admin akan memutuskan refund atau pencairan."
        : "";
  const url = audience === "admin" ? `${publicEnv.siteUrl}/admin?tab=sengketa` : orderUrl(ctx.orderId);
  return {
    subject: `[${orderCode(ctx.orderId)}] Laporan masalah dibuka`,
    html: layout({
      heading,
      intro,
      rows,
      body: extra ? escape(extra) : undefined,
      cta: { label: audience === "admin" ? "Tinjau sengketa" : "Buka pesanan", url },
    }),
    text: plain(heading, intro, rows, extra, url),
  };
}

// 4. Dana dicairkan ------------------------------------------------------------

export function payoutSent(ctx: { amountIdr: number; transferReference: string; entryCount: number; destination: string }) {
  const heading = "Dana sudah ditransfer";
  const intro = "Saldo penjualanmu sudah kami transfer ke rekening/e-wallet pencairan.";
  const rows: Row[] = [
    ["Nominal bersih", formatIDR(ctx.amountIdr)],
    ["Jumlah transaksi", `${ctx.entryCount} pesanan`],
    ["Tujuan", ctx.destination],
    ["Referensi transfer", ctx.transferReference],
  ];
  const url = `${publicEnv.siteUrl}/profile`;
  return {
    subject: `Dana ${formatIDR(ctx.amountIdr)} sudah ditransfer`,
    html: layout({ heading, intro, rows, cta: { label: "Lihat riwayat saldo", url } }),
    text: plain(heading, intro, rows, "", url),
  };
}

// Verifikasi alumni/dosen ---------------------------------------------------------

export function verificationDecision(approved: boolean, reason?: string) {
  const heading = approved ? "Akunmu sudah terverifikasi" : "Verifikasi akun belum dapat disetujui";
  const intro = approved
    ? "Admin sudah memverifikasi bukti identitas kampusmu. Sekarang kamu bisa membeli dan menjual barang."
    : "Admin belum dapat menyetujui bukti identitas yang kamu unggah. Silakan unggah ulang bukti yang lebih jelas.";
  const rows: Row[] = !approved && reason ? [["Alasan", reason]] : [];
  const url = `${publicEnv.siteUrl}/profile`;
  return {
    subject: heading,
    html: layout({ heading, intro, rows, cta: { label: "Buka profil", url } }),
    text: plain(heading, intro, rows, "", url),
  };
}
