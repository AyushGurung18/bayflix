import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, isAdminConfigured, requireAuthedUser } from "@/lib/firebase-admin";
import { isAuthEmailConfigured, sendAuthEmail } from "@/lib/auth-email";
import { changeEmailHtml } from "@/lib/email-templates";
import { isValidEmail } from "@/lib/validators";

// The caller's current email is taken from their verified ID token, never
// from a client-supplied field — trusting a client-supplied "current email"
// would let anyone request a change-email link for someone else's account.
// generateVerifyAndChangeEmailLink applies the change purely from the link
// being opened, with no separate ownership check of the current account.
export async function POST(request: NextRequest) {
  const caller = await requireAuthedUser(request);
  if (!caller || !caller.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let newEmail: unknown;
  try {
    ({ newEmail } = await request.json());
  } catch {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (typeof newEmail !== "string" || !isValidEmail(newEmail)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (newEmail === caller.email) {
    return NextResponse.json({ error: "That's already your email." }, { status: 400 });
  }

  if (!isAdminConfigured() || !isAuthEmailConfigured()) {
    return NextResponse.json({ fallback: true }, { status: 501 });
  }

  try {
    const link = await getAdminAuth().generateVerifyAndChangeEmailLink(caller.email, newEmail, {
      url: `${request.nextUrl.origin}/auth/action`,
      handleCodeInApp: true,
    });

    await sendAuthEmail({
      to: newEmail,
      subject: "Confirm your new Bayflix email",
      html: changeEmailHtml({ link, newEmail }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = (error as { code?: string })?.code || "";
    if (code.includes("email-already-exists")) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 400 });
    }
    console.error("change-email send failed:", error);
    return NextResponse.json({ error: "Failed to send confirmation email. Please try again." }, { status: 500 });
  }
}
