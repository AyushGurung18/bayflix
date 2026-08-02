import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, isAdminConfigured, requireAuthedUser } from "@/lib/firebase-admin";
import { isAuthEmailConfigured, sendAuthEmail } from "@/lib/auth-email";
import { verificationEmailHtml } from "@/lib/email-templates";

// Same bypass-Firebase's-default-sender pattern as app/api/auth/magic-link —
// mints the verification link via the Admin SDK, sends it branded via
// Resend. 501 (client falls back to Firebase's sendEmailVerification) until
// Resend/Admin SDK env vars are configured.
export async function POST(request: NextRequest) {
  const caller = await requireAuthedUser(request);
  if (!caller || !caller.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (!isAdminConfigured() || !isAuthEmailConfigured()) {
    return NextResponse.json({ fallback: true }, { status: 501 });
  }

  try {
    const link = await getAdminAuth().generateEmailVerificationLink(caller.email, {
      url: `${request.nextUrl.origin}/auth/action`,
      handleCodeInApp: true,
    });

    await sendAuthEmail({
      to: caller.email,
      subject: "Verify your Bayflix email",
      html: verificationEmailHtml({ link, email: caller.email }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("verify-email send failed:", error);
    return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 });
  }
}
