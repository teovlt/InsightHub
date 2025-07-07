import { Routes, Route, Navigate } from "react-router-dom";
import { LayoutWrapper } from "./layoutWrapper";

import { Account } from "@/pages/Account";
import { ProtectedRoute } from "@/router/protectedRoute";
import { Home } from "@/pages/Home";
import { Index } from "@/pages/Admin";
import { Logs } from "@/pages/Admin/components/logs";
import { Users } from "@/pages/Admin/components/users";
import { Dashboard } from "@/pages/Admin/components/dashboard";
import { Login } from "@/pages/Authentication/login";
import { Register } from "@/pages/Authentication/register";
import { Config } from "@/pages/Admin/components/config";
import { RegisterGoogleForm } from "@/pages/Authentication/registerGoogleForm";
import { Categories } from "@/pages/Admin/components/categories";
import { Statistics } from "@/pages/Statistics";
import { Integrations } from "@/pages/Admin/components/integrations";
import { IntegrationsPage } from "@/pages/Integrations";

export const Router = () => {
  return (
    <Routes>
      <Route element={<LayoutWrapper withLayout={false} />}>
        <Route
          path="/login"
          element={
            <ProtectedRoute authRequired={false}>
              <Login />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register"
          element={
            <ProtectedRoute authRequired={false}>
              <Register />
            </ProtectedRoute>
          }
        />

        <Route
          path="/register/google"
          element={
            <ProtectedRoute authRequired={false}>
              <RegisterGoogleForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute authRequired={true} role="admin">
              <Index />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="logs" element={<Logs />} />
          <Route path="categories" element={<Categories />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="settings" element={<Config />} />
        </Route>
      </Route>

      <Route element={<LayoutWrapper />}>
        <Route
          path="/"
          element={
            <ProtectedRoute authRequired={true}>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute authRequired={true}>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute authRequired={true}>
              <Statistics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/integrations"
          element={
            <ProtectedRoute authRequired={true}>
              <IntegrationsPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};
