import type { Metadata, Viewport } from "next";
import LoginBrandPanel from "@/components/login/LoginBrandPanel";
import LoginPanel from "@/components/login/LoginPanel";
import surface from "@/components/ui/brandSurface.module.css";

export const metadata: Metadata = {
  title: "Sign in | Setter",
};

// Matches the page surface so browsers that tint their toolbar use white.
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function LoginPage() {
  return (
    <main className={`${surface.surface} flex min-h-dvh flex-col lg:flex-row`}>
      <LoginBrandPanel />
      <LoginPanel />
    </main>
  );
}
