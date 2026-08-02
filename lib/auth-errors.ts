export function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Incorrect email or password.";
  }
  if (code.includes("email-already-in-use")) {
    return "This email already has a password-based account. Try signing in with a password instead.";
  }
  if (code.includes("popup-closed-by-user")) {
    return "Sign-in was cancelled.";
  }
  if (code.includes("weak-password")) {
    return "Please choose a stronger password.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (code.includes("invalid-action-code") || code.includes("expired-action-code")) {
    return "This link is invalid or has expired.";
  }
  if (code.includes("requires-recent-login")) {
    return "For security, please sign out and sign back in, then try again.";
  }
  if (!code && err instanceof Error && err.message) {
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
