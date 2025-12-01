import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import TechnicianLayout from "./layouts/TechnicianLayout";
import CustomerHome from "./pages/CustomerHome";
import CustomerDashboard from "./pages/CustomerDashboard";
import SignatureHistory from "./pages/SignatureHistory";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NewRepair from "./pages/NewRepair";
import Repairs from "./pages/Repairs";
import RepairDetail from "./pages/RepairDetail";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Appointments from "./pages/Appointments";
import Feedback from "./pages/Feedback";
import Quotes from "./pages/Quotes";
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
            <Route path="/" element={<CustomerHome />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/customer-dashboard"
              element={
                <ProtectedRoute>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/signature-history"
              element={
                <ProtectedRoute>
                  <SignatureHistory />
                </ProtectedRoute>
              }
            />
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
              path="/customers/:id"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <CustomerDetail />
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
            <Route
              path="/appointments"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <Appointments />
                  </TechnicianLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <Feedback />
                  </TechnicianLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/quotes"
              element={
                <ProtectedRoute requireTechnician>
                  <TechnicianLayout>
                    <Quotes />
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
