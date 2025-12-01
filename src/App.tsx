import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import TechnicianLayout from "./layouts/TechnicianLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NewRepair from "./pages/NewRepair";
import Repairs from "./pages/Repairs";
import RepairDetail from "./pages/RepairDetail";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <Dashboard />
                  </TechnicianLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/new-repair"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <NewRepair />
                  </TechnicianLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/repairs"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <Repairs />
                  </TechnicianLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/repairs/:id"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <RepairDetail />
                  </TechnicianLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <Customers />
                  </TechnicianLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <Inventory />
                  </TechnicianLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <Orders />
                  </TechnicianLayout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
