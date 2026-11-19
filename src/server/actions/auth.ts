"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MESSAGES } from "@/config/constants";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validations";
import { fail, mapDbError, ok, type ActionResult } from "@/server/errors";

export async function signInAction(raw: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  if (!isSupabaseConfigured) {
    return fail("Supabase belum dikonfigurasi. Lengkapi .env.local terlebih dahulu.");
  }

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Periksa kembali email dan kata sandimu.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await getSupabaseServerClient();
  let { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  // Jika akun terdaftar saat mode pengembangan namun email belum terkonfirmasi,
  // konfirmasi otomatis menggunakan service_role agar tidak menghambat login.
  if (
    error &&
    error.message.toLowerCase().includes("email not confirmed") &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", parsed.data.email)
      .maybeSingle();

    if (profile) {
      await admin.auth.admin.updateUserById(profile.id, { email_confirm: true });
      const retry = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      error = retry.error;
    }
  }

  if (error) {
    return fail("Email atau kata sandi salah. Pastikan akun sudah terdaftar.");
  }

  revalidatePath("/", "layout");
  return ok({ redirectTo: "/" });
}

export async function signUpAction(
  raw: unknown,
): Promise<ActionResult<{ needsEmailConfirmation: boolean; needsManualVerification: boolean }>> {
  if (!isSupabaseConfigured) {
    return fail("Supabase belum dikonfigurasi. Lengkapi .env.local terlebih dahulu.");
  }

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Periksa kembali data pendaftaranmu.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await getSupabaseServerClient();
  const { data: campus } = await supabase
    .from("campuses")
    .select("id, allowed_email_domains, is_active")
    .eq("id", parsed.data.campusId)
    .maybeSingle();

  if (!campus || !campus.is_active) {
    return fail("Kampus yang dipilih tidak ditemukan atau belum aktif.");
  }

  const emailDomain = parsed.data.email.split("@")[1]?.toLowerCase() ?? "";
  const isCampusEmail = campus.allowed_email_domains.some((d) => d.toLowerCase() === emailDomain);

  if (parsed.data.userType === "student" && !isCampusEmail) {
    return fail(MESSAGES.emailDomain, { email: [MESSAGES.emailDomain] });
  }

  // Jika SUPABASE_SERVICE_ROLE_KEY tersedia, buat akun via Admin API dengan
  // email_confirm: true lalu langsung login. Trigger `on_auth_user_created`
  // tetap menetapkan verification_status = 'verified' (untuk email kampus)
  // atau 'pending' (untuk email pribadi alumni/dosen).
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = getSupabaseAdminClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        campus_id: campus.id,
        full_name: parsed.data.fullName,
        user_type: parsed.data.userType,
      },
    });

    if (createError) {
      if (
        createError.message.toLowerCase().includes("already") ||
        createError.message.toLowerCase().includes("registered")
      ) {
        return fail("Email ini sudah terdaftar. Silakan masuk.");
      }
      return fail(mapDbError(createError, createError.message));
    }

    await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    revalidatePath("/", "layout");
    return ok({
      needsEmailConfirmation: false,
      needsManualVerification: !isCampusEmail,
    });
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/profile`,
      data: {
        campus_id: campus.id,
        full_name: parsed.data.fullName,
        user_type: parsed.data.userType,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return fail("Email ini sudah terdaftar. Silakan masuk.");
    }
    return fail(mapDbError(error, error.message));
  }

  revalidatePath("/", "layout");
  return ok({
    needsEmailConfirmation: !data.session,
    needsManualVerification: !isCampusEmail,
  });
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordResetAction(
  emailRaw: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) {
    return fail("Supabase belum dikonfigurasi.");
  }

  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return fail("Masukkan alamat email yang valid.");
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return fail(mapDbError(error, "Gagal mengirim tautan pemulihan kata sandi."));
    }

    return ok(
      undefined,
      "Jika email tersebut terdaftar, tautan pemulihan kata sandi telah dikirim. Periksa kotak masuk atau folder spam.",
    );
  } catch (err) {
    console.error("[requestPasswordResetAction] Error:", err);
    return fail("Gagal memproses permintaan pemulihan kata sandi.");
  }
}

export async function updatePasswordAction(
  newPassword: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) {
    return fail("Supabase belum dikonfigurasi.");
  }

  if (newPassword.length < 8) {
    return fail("Kata sandi baru minimal 8 karakter.");
  }

  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail(
        "Sesi pemulihan sudah berakhir atau tidak valid. Silakan minta tautan baru dari halaman Lupa Kata Sandi.",
      );
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return fail(mapDbError(error, "Gagal memperbarui kata sandi."));
    }

    revalidatePath("/", "layout");
    return ok(undefined, "Kata sandi berhasil diperbarui! Kamu sudah masuk dengan sandi baru.");
  } catch (err) {
    console.error("[updatePasswordAction] Error:", err);
    return fail("Terjadi kendala saat memperbarui kata sandi.");
  }
}
