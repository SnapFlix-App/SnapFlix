import { siteConfig } from "@/config/site";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `Welcome Back to ${siteConfig.name}`,
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

