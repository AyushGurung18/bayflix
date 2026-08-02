"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { useAuth } from "@/lib/auth-context";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInGoogle } = useAuth();
  const defaultEmail = searchParams.get("email") || "";

  const handlePasswordSubmit = async ({ email, password }: { email: string; password: string }) => {
    await signIn(email, password);
    router.push("/browse");
  };

  const handleGoogle = async () => {
    await signInGoogle();
    router.push("/browse");
  };

  return (
    <AuthForm
      mode="signin"
      background="/images/bg-hero-1.jpg"
      onPasswordSubmit={handlePasswordSubmit}
      onGoogle={handleGoogle}
      defaultEmail={defaultEmail}
    />
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
