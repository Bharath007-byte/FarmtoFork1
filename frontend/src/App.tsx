import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppState";
import { I18nProvider } from "./i18n";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FloatingChatbot } from "./components/FloatingChatbot";
import { Landing } from "./pages/Landing";
import { Join } from "./pages/Join";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Shop, CartPage } from "./pages/Shop";
import { ProductPage } from "./pages/ProductPage";
import { Checkout } from "./pages/Checkout";
import { Farmers } from "./pages/Farmers";
import { AddressSelection } from "./pages/AddressSelection";
import { FarmerDashboard } from "./pages/FarmerDashboard";
import { FarmerProduce } from "./pages/FarmerProduce";
import { SellProduce } from "./pages/SellProduce";
import { AiAdvisory } from "./pages/AiAdvisory";
import { FarmerCommunity } from "./pages/farmer/FarmerCommunity";
import { MyFarmsPage } from "./pages/farmer/MyFarmsPage";
import { KrishiAiStudio } from "./pages/farmer/KrishiAiStudio";
import { LogisticsDashboard } from "./pages/LogisticsDashboard";
import { LogisticsDeliveries } from "./pages/LogisticsDeliveries";
import { LogisticsJobs } from "./pages/LogisticsJobs";
import { LogisticsTracker } from "./pages/LogisticsTracker";
import { LogisticsEarnings } from "./pages/logistics/LogisticsEarnings";
import { LogisticsFleet } from "./pages/logistics/LogisticsFleet";
import { LogisticsVehicle } from "./pages/logistics/LogisticsVehicle";
import { LogisticsProfile } from "./pages/logistics/LogisticsProfile";
import { LogisticsSupport } from "./pages/logistics/LogisticsSupport";
import { LogisticsGuard } from "./components/LogisticsGuard";
import { LogisticsRegisterStep1 } from "./pages/logistics/LogisticsRegisterStep1";
import { LogisticsRegisterStep2 } from "./pages/logistics/LogisticsRegisterStep2";
import { LogisticsRegisterStep3 } from "./pages/logistics/LogisticsRegisterStep3";
import { LogisticsRegisterStep4 } from "./pages/logistics/LogisticsRegisterStep4";
import { LogisticsRegisterStep5 } from "./pages/logistics/LogisticsRegisterStep5";
import { LogisticsRegisterStep6 } from "./pages/logistics/LogisticsRegisterStep6";
import { LogisticsPortal } from "./pages/LogisticsPortal";

import { Orders } from "./pages/Orders";
import { OrderDetails } from "./pages/OrderDetails";
import { OrderTracking } from "./pages/OrderTracking";
import { FarmerShell } from "./features/farmer/FarmerShell";
import {
  CollabPage,
  EarningsPage,
  FarmerProductInfo,
  FarmerProfilePage,
  InventoryPage,
  MarketPage,
  NotificationsPage,
  PredictionsPage,
} from "./features/farmer/FarmerDesk";
import { SocietyBulkDesk } from "./pages/SocietyBulkDesk";
import { AdminLayout } from "./layouts/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminSocieties } from "./pages/admin/AdminSocieties";
import { AdminLogistics } from "./pages/admin/AdminLogistics";
import { AdminSocietyDetails } from "./pages/admin/AdminSocietyDetails";
import { AdminPayments } from "./pages/admin/AdminPayments";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { AdminFarmers } from "./pages/admin/AdminFarmers";
import { AdminInventory } from "./pages/admin/AdminInventory";
import { AdminOrders } from "./pages/admin/AdminOrders";
const FarmAI = lazy(() =>
  import("./pages/FarmAI").then((m) => ({ default: m.FarmAI }))
);
const DigitalTwin = lazy(() =>
  import("./pages/DigitalTwin").then((m) => ({ default: m.DigitalTwin }))
);
const AgriMapPage = lazy(() =>
  import("./pages/AgriMapPage").then((m) => ({ default: m.AgriMapPage }))
);
const WasteDesk = lazy(() =>
  import("./pages/WasteDesk").then((m) => ({ default: m.WasteDesk }))
);

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f4ec] text-sm text-zinc-500">
      Loading desk…
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/farmers" element={<Farmers />} />
              <Route path="/join" element={<Join />} />
              <Route path="/register/:role" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              {/* Open Marketplace (Guests can browse & add to cart) */}
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute role="consumer">
  <AddressSelection />
</ProtectedRoute>
                }
              />
              <Route
                path="/checkout/payment"
                element={
                  <ProtectedRoute role="consumer">
  <Checkout />
</ProtectedRoute>
                }
              />
              <Route path="/map" element={<AgriMapPage />} />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute role="consumer">
  <Orders />
</ProtectedRoute>
                }
              />
             <Route
  path="/orders/:id"
  element={
    <ProtectedRoute role="consumer">
      <OrderDetails />
    </ProtectedRoute>
  }
/>
<Route
  path="/orders/:id/track"
  element={
    <ProtectedRoute role="consumer">
      <OrderTracking />
    </ProtectedRoute>
  }
/>
              <Route
                path="/farmer"
                element={
                  <ProtectedRoute role="farmer">
                    <FarmerShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<FarmerDashboard />} />
                <Route path="krishi-ai" element={<KrishiAiStudio />} />
                <Route path="sell" element={<SellProduce />} />
                <Route path="produce" element={<FarmerProduce />} />
                <Route path="products/:id" element={<FarmerProductInfo />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="orders" element={<Navigate to="/farmer/advisory" replace />} />
                <Route path="earnings" element={<EarningsPage />} />
                <Route path="market" element={<MarketPage />} />
                <Route path="predictions" element={<PredictionsPage />} />
                <Route path="logistics" element={<SocietyBulkDesk />} />
                <Route path="cooperative" element={<SocietyBulkDesk />} />
                <Route path="collaborations" element={<CollabPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<FarmerProfilePage />} />
                <Route path="advisory" element={<AiAdvisory />} />
                <Route path="community" element={<FarmerCommunity />} />
                <Route path="farm-management" element={<MyFarmsPage />} />
                <Route path="my-farms" element={<MyFarmsPage />} />
              </Route>
              <Route
                path="/farmer/farmai"
                element={
                  <ProtectedRoute role="farmer">
                    <FarmAI />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/twin"
                element={
                  <ProtectedRoute role={["farmer", "admin"]}>
                    <DigitalTwin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/digital-twin"
                element={
                  <ProtectedRoute role={["farmer", "admin"]}>
                    <DigitalTwin />
                  </ProtectedRoute>
                }
              />
              {/* Logistics Portal & Multi-Step Onboarding */}
              <Route path="/logistics/portal" element={<LogisticsPortal />} />
              <Route path="/logistics/register" element={<LogisticsRegisterStep1 />} />
              <Route
                path="/logistics/register/documents"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsRegisterStep2 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/register/verification"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsRegisterStep3 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/register/status"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsRegisterStep4 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/register/vehicle"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsRegisterStep5 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/register/approval"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsRegisterStep6 />
                  </ProtectedRoute>
                }
              />

              {/* Protected Logistics Operations (Unlocked upon approval) */}
              <Route
                path="/logistics"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsGuard>
                      <LogisticsDashboard />
                    </LogisticsGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/logistics/deliveries"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsGuard>
                      <LogisticsDeliveries />
                    </LogisticsGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/logistics/jobs"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsGuard>
                      <LogisticsJobs />
                    </LogisticsGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/logistics/tracker/:jobId"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsGuard>
                      <LogisticsTracker />
                    </LogisticsGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/logistics/earnings"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsGuard>
                      <LogisticsEarnings />
                    </LogisticsGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/logistics/fleet"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsGuard>
                      <LogisticsFleet />
                    </LogisticsGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/logistics/vehicle"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsGuard>
                      <LogisticsVehicle />
                    </LogisticsGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/logistics/profile"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsGuard>
                      <LogisticsProfile />
                    </LogisticsGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/logistics/support"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsGuard>
                      <LogisticsSupport />
                    </LogisticsGuard>
                  </ProtectedRoute>
                }
              />


              <Route
  path="/admin"
  element={
    <ProtectedRoute role="admin">
      <AdminLayout />
    </ProtectedRoute>
  }
>
    <Route index element={<AdminDashboard />} />
<Route path="societies" element={<AdminSocieties />} />
<Route path="community-requests" element={<AdminSocieties defaultTab="requests" />} />
<Route path="logistics" element={<AdminLogistics />} />
<Route path="payments" element={<AdminPayments />} />
<Route
  path="societies/:id"
  element={<AdminSocietyDetails />}
/>
<Route path="farmers" element={<AdminFarmers />} />
<Route path="inventory" element={<AdminInventory />} />
<Route path="orders" element={<AdminOrders />} />
<Route path="settings" element={<AdminSettings />} />
</Route>
              <Route
                path="/admin/waste"
                element={
                  <ProtectedRoute role="admin">
                    <WasteDesk />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
          <FloatingChatbot />
        </BrowserRouter>
      </AppProvider>
    </I18nProvider>
  );
}
