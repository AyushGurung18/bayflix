import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase-admin";
import { isAuthEmailConfigured, sendAuthEmail } from "@/lib/auth-email";
import { passwordResetEmailHtml } from "@/lib/email-templates";
import { isValidEmail } from "@/lib/validators";

// Signed-out "forgot password" entry point — same trust level as
// magic-link (anyone can request one for any address). Mints the reset
// link via the Admin SDK and sends it branded via Resend; 501 (client
// falls back to Firebase's sendPasswordResetEmail) until those env vars
// are configured.
export async function POST(request: NextRequest) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (typeof email !== "string" || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (!isAdminConfigured() || !isAuthEmailConfigured()) {
    return NextResponse.json({ fallback: true }, { status: 501 });
  }

  try {
    const link = await getAdminAuth().generatePasswordResetLink(email, {
      url: `${request.nextUrl.origin}/auth/action`,
      handleCodeInApp: true,
    });

    await sendAuthEmail({
      to: email,
      subject: "Reset your Bayflix password",
      html: passwordResetEmailHtml({ link, email }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = (error as { code?: string })?.code || "";
    if (code.includes("user-not-found")) {
      // Don't reveal whether this address has an account — respond the same
      // as a real success.
      return NextResponse.json({ ok: true });
    }
    console.error("reset-password send failed:", error);
    return NextResponse.json({ error: "Failed to send reset link. Please try again." }, { status: 500 });
  }
}
