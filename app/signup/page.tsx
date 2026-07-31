"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { useAuth } from "@/lib/auth-context";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, signInGoogle } = useAuth();
  const defaultEmail = searchParams.get("email") || "";

  const handleSubmit = async ({
    email,
    password,
    displayName,
  }: {
    email: string;
    password: string;
    displayName: string;
  }) => {
    await signUp(email, password, displayName);
    router.push("/browse");
  };

  const handleGoogle = async () => {
    await signInGoogle();
    router.push("/browse");
  };

  return (
    <AuthForm
      mode="signup"
      background="/images/bg-hero-2.jpg"
      onSubmit={handleSubmit}
      onGoogle={handleGoogle}
      defaultEmail={defaultEmail}
    />
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
