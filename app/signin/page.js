"use client";

import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { useAuth } from "@/lib/auth-context";

export default function SignInPage() {
  const router = useRouter();
  const { signIn, signInGoogle } = useAuth();

  const handleSubmit = async ({ email, password }) => {
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
      onSubmit={handleSubmit}
      onGoogle={handleGoogle}
    />
  );
}
