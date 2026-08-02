import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase-admin";
import { isAuthEmailConfigured, sendAuthEmail } from "@/lib/auth-email";
import { magicLinkEmailHtml } from "@/lib/email-templates";
import { isValidEmail } from "@/lib/validators";

// Bypasses Firebase's built-in sign-in-link email, which is always sent from
// a shared *.firebaseapp.com address with no deliverability control — the
// Admin SDK can mint the same sign-in link without Firebase sending anything,
// so it's emailed here instead, branded, from our own domain via Resend.
//
// Until FIREBASE_ADMIN_* and RESEND_* env vars are set, this responds 501 and
// the client falls back to Firebase's default sender (see auth-context.tsx)
// so sign-in keeps working — just without the branding/deliverability fix —
// while those are being configured.
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
    const link = await getAdminAuth().generateSignInWithEmailLink(email, {
      url: `${request.nextUrl.origin}/auth/finish`,
      handleCodeInApp: true,
    });

    await sendAuthEmail({
      to: email,
      subject: "Your Bayflix sign-in link",
      html: magicLinkEmailHtml({ link, email }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("magic-link send failed:", error);
    return NextResponse.json({ error: "Failed to send sign-in link. Please try again." }, { status: 500 });
  }
}
