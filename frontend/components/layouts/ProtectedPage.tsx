"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui";
import AppShell from "./AppShell";

interface Props {
  children: ReactNode;
  roles?: string[];
}

export default function ProtectedPage({ children, roles }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && roles && !roles.includes(user.rol)) {
      router.replace("/dashboard");
    }
  }, [user, loading, router, roles]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (roles && !roles.includes(user.rol)) return null;

  return <AppShell>{children}</AppShell>;
}
