import AuthForms from "@/components/sections/Auth/Forms";
import { siteConfig } from "@/config/site";
import { Spinner } from "@heroui/react";
import { Metadata, NextPage } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: `Welcome Back to ${siteConfig.name}`,
};

const AuthPage: NextPage = () => {
  return (
    <Suspense fallback={<Spinner size="lg" className="absolute-center" variant="simple" />}>
      <AuthForms />
    </Suspense>
  );
};

export default AuthPage;
