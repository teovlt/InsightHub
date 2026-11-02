import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Loading } from "@/components/customs/loading";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

interface LayoutWrapperProps {
  withLayout?: boolean;
}

export const LayoutWrapper = ({ withLayout = true }: LayoutWrapperProps) => {
  return (
    <>
      {withLayout && <Navbar />}
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
      {/* {withLayout && <Footer />} */}
    </>
  );
};
