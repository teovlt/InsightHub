import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LayoutWrapper } from "./layoutWrapper";

import { ProtectedRoute } from "@/router/protectedRoute";
import { Home } from "@/pages/Home";

// Pages export named components; React.lazy needs a default export
const lazyNamed = <M, K extends keyof M>(load: () => Promise<M>, name: K) =>
  lazy(async () => ({ default: (await load())[name] as React.ComponentType }));

// Everything except the home page is split into its own chunk, loaded on navigation.
// The Suspense boundaries live in LayoutWrapper and in the admin layout.
const Login = lazyNamed(() => import("@/pages/Authentication/login"), "Login");
const Register = lazyNamed(() => import("@/pages/Authentication/register"), "Register");
const RegisterGoogleForm = lazyNamed(() => import("@/pages/Authentication/registerGoogleForm"), "RegisterGoogleForm");
const Statistics = lazyNamed(() => import("@/pages/Statistics"), "Statistics");
const Account = lazyNamed(() => import("@/pages/Account"), "Account");
const IntegrationsPage = lazyNamed(() => import("@/pages/Integrations"), "IntegrationsPage");
const Achievements = lazyNamed(() => import("@/pages/Achievements"), "Achievements");
const Index = lazyNamed(() => import("@/pages/Admin"), "Index");
const Dashboard = lazyNamed(() => import("@/pages/Admin/components/dashboard"), "Dashboard");
const Users = lazyNamed(() => import("@/pages/Admin/components/users"), "Users");
const Logs = lazyNamed(() => import("@/pages/Admin/components/logs"), "Logs");
const Categories = lazyNamed(() => import("@/pages/Admin/components/categories"), "Categories");
const Integrations = lazyNamed(() => import("@/pages/Admin/components/integrations"), "Integrations");

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
        <Route
          path="/achievements"
          element={
            <ProtectedRoute authRequired={true}>
              <Achievements />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};
