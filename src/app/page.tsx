"use client";

import { useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { EchoDeskLanding } from "@/components/landing";
import LoginForm from "@/components/LoginForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { toast } from "sonner";

function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tenant, loading: tenantLoading, error } = useTenant();
  const { isAuthenticated, user, login } = useAuth();

  const handleOAuthCallback = useCallback(() => {
    if (typeof window === "undefined") return;

    const facebookStatus = searchParams.get("facebook_status");
    const message = searchParams.get("message");
    const pages = searchParams.get("pages");

    // Handle Facebook OAuth callback
    if (facebookStatus) {
      if (facebookStatus === "connected") {
        const successMessage =
          message || `Successfully connected ${pages || "0"} Facebook page(s)`;
        toast.success("✅ Facebook Connected", {
          description: successMessage,
        });
      } else if (facebookStatus === "error") {
        const errorMessage = message || "Failed to connect Facebook";
        toast.error("❌ Facebook Connection Failed", {
          description: decodeURIComponent(errorMessage),
        });
      }

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    // Handle OAuth callback parameters
    handleOAuthCallback();
  }, [handleOAuthCallback]);

  // Redirect authenticated users to tickets (only on root path)
  useEffect(() => {
    if (tenant && isAuthenticated && user && pathname === "/") {
      const savedPath = localStorage.getItem("echodesk_redirect_after_login");
      if (savedPath) {
        localStorage.removeItem("echodesk_redirect_after_login");
        router.replace(savedPath);
      } else {
        router.replace("/tickets");
      }
    }
  }, [tenant, isAuthenticated, user, pathname, router]);

  // Show error if tenant loading failed
  if (error) {
    return <ErrorMessage error={error} />;
  }

  // Wait for tenant to load
  if (tenantLoading) {
    return <LoadingSpinner />;
  }

  // If tenant exists (subdomain), handle authentication
  if (tenant) {
    // If authenticated and on root path only, show loading while redirecting
    if (isAuthenticated && user && pathname === "/") {
      return <LoadingSpinner message="Redirecting to dashboard..." />;
    }
    // If not on root path, this component shouldn't be rendered, but just in case
    if (isAuthenticated && user) {
      return null;
    }

    // Show login form
    return <LoginForm tenant={tenant} onLogin={login} />;
  }

  // If no tenant (main domain), show landing page
  return <EchoDeskLanding />;
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomeContent />
    </Suspense>
  );
}
