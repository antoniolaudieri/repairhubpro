import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageTransition } from "@/components/PageTransition";
import TechnicianLayout from "@/layouts/TechnicianLayout";
import CustomerHome from "@/pages/CustomerHome";
import CustomerDashboard from "@/pages/CustomerDashboard";
import CustomerRepairDetail from "@/pages/CustomerRepairDetail";
import SignatureHistory from "@/pages/SignatureHistory";
import Dashboard from "@/pages/Dashboard";
import Auth from "@/pages/Auth";
import NewRepair from "@/pages/NewRepair";
import Repairs from "@/pages/Repairs";
import RepairDetail from "@/pages/RepairDetail";
import RepairGuides from "@/pages/RepairGuides";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Inventory from "@/pages/Inventory";
import Orders from "@/pages/Orders";
import Appointments from "@/pages/Appointments";
import Feedback from "@/pages/Feedback";
import Quotes from "@/pages/Quotes";
import PricingSettings from "@/pages/PricingSettings";
import PlatformAdmin from "@/pages/PlatformAdmin";
import ProviderRegistration from "@/pages/ProviderRegistration";
import CornerDashboard from "@/pages/CornerDashboard";
import RiparatoreDashboard from "@/pages/RiparatoreDashboard";
import CentroDashboard from "@/pages/CentroDashboard";
import CentroLavori from "@/pages/centro/CentroLavori";
import CentroRepairDetail from "@/pages/centro/CentroRepairDetail";
import CentroClienti from "@/pages/centro/CentroClienti";
import CentroInventario from "@/pages/centro/CentroInventario";
import CentroCollaboratori from "@/pages/centro/CentroCollaboratori";
import CentroAccessi from "@/pages/centro/CentroAccessi";
import CentroCommissioni from "@/pages/centro/CentroCommissioni";
import CentroImpostazioni from "@/pages/centro/CentroImpostazioni";
import CentroGuide from "@/pages/centro/CentroGuide";
import CentroPreventivi from "@/pages/centro/CentroPreventivi";
import CentroOrdini from "@/pages/centro/CentroOrdini";
import CentroListino from "@/pages/centro/CentroListino";
import CentroNuovoRitiro from "@/pages/centro/CentroNuovoRitiro";
import CentroClienteDetail from "@/pages/centro/CentroClienteDetail";
import NotFound from "@/pages/NotFound";

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><CustomerHome /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route
          path="/customer-dashboard"
          element={
            <ProtectedRoute>
              <PageTransition><CustomerDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/signature-history"
          element={
            <ProtectedRoute>
              <PageTransition><SignatureHistory /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-repairs/:id"
          element={
            <ProtectedRoute>
              <PageTransition><CustomerRepairDetail /></PageTransition>
            </ProtectedRoute>
          }
        />
        {/* Platform Admin Route */}
        <Route
          path="/platform-admin"
          element={
            <ProtectedRoute>
              <PageTransition><PlatformAdmin /></PageTransition>
            </ProtectedRoute>
          }
        />
        {/* Provider Registration */}
        <Route
          path="/diventa-partner"
          element={
            <ProtectedRoute>
              <PageTransition><ProviderRegistration /></PageTransition>
            </ProtectedRoute>
          }
        />
        {/* Corner Dashboard */}
        <Route
          path="/corner"
          element={
            <ProtectedRoute requireCorner>
              <CornerDashboard />
            </ProtectedRoute>
          }
        />
        {/* Riparatore Dashboard */}
        <Route
          path="/riparatore"
          element={
            <ProtectedRoute requireRiparatore>
              <RiparatoreDashboard />
            </ProtectedRoute>
          }
        />
        {/* Centro Dashboard */}
        <Route
          path="/centro"
          element={
            <ProtectedRoute requireCentro>
              <CentroDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/lavori"
          element={
            <ProtectedRoute requireCentro>
              <CentroLavori />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/lavori/:id"
          element={
            <ProtectedRoute requireCentro>
              <CentroRepairDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/clienti"
          element={
            <ProtectedRoute requireCentro>
              <CentroClienti />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/clienti/:id"
          element={
            <ProtectedRoute requireCentro>
              <CentroClienteDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/inventario"
          element={
            <ProtectedRoute requireCentro>
              <CentroInventario />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/collaboratori"
          element={
            <ProtectedRoute requireCentro>
              <CentroCollaboratori />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/accessi"
          element={
            <ProtectedRoute requireCentro>
              <CentroAccessi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/commissioni"
          element={
            <ProtectedRoute requireCentro>
              <CentroCommissioni />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/impostazioni"
          element={
            <ProtectedRoute requireCentro>
              <CentroImpostazioni />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/guide"
          element={
            <ProtectedRoute requireCentro>
              <CentroGuide />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/preventivi"
          element={
            <ProtectedRoute requireCentro>
              <CentroPreventivi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/ordini"
          element={
            <ProtectedRoute requireCentro>
              <CentroOrdini />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/listino"
          element={
            <ProtectedRoute requireCentro>
              <CentroListino />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centro/nuovo-ritiro"
          element={
            <ProtectedRoute requireCentro>
              <CentroNuovoRitiro />
            </ProtectedRoute>
          }
        />
        {/* Technician Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><Dashboard /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-repair"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><NewRepair /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/repairs"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><Repairs /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/repairs/:id"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><RepairDetail /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/repair-guides"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><RepairGuides /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><Customers /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><CustomerDetail /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><Inventory /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><Orders /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><Appointments /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><Feedback /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotes"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><Quotes /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pricing-settings"
          element={
            <ProtectedRoute requireTechnician>
              <TechnicianLayout>
                <PageTransition><PricingSettings /></PageTransition>
              </TechnicianLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};
