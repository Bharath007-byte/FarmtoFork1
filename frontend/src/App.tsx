import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppState";
import { I18nProvider } from "./i18n";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Landing } from "./pages/Landing";
import { Join } from "./pages/Join";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Shop, CartPage } from "./pages/Shop";
import { ProductPage } from "./pages/ProductPage";
import { Checkout } from "./pages/Checkout";
import { AddressSelection } from "./pages/AddressSelection";
import { FarmerDashboard, FarmerFeature } from "./pages/FarmerDashboard";
import { FarmerProduce } from "./pages/FarmerProduce";
import { SellProduce } from "./pages/SellProduce";
import { AiAdvisory } from "./pages/AiAdvisory";
import { LogisticsDashboard } from "./pages/LogisticsDashboard";
import { LogisticsJobs } from "./pages/LogisticsJobs";
import { LogisticsTracker } from "./pages/LogisticsTracker";
import { Orders } from "./pages/Orders";
import { FarmerShell } from "./features/farmer/FarmerShell";
import {
  CollabPage,
  EarningsPage,
  FarmerOrdersPage,
  FarmerProductInfo,
  FarmerProfilePage,
  InventoryPage,
  LogisticsPage,
  MarketPage,
  NotificationsPage,
  PredictionsPage,
} from "./features/farmer/FarmerDesk";

const FarmAI = lazy(() =>
  import("./pages/FarmAI").then((m) => ({ default: m.FarmAI }))
);
const DigitalTwin = lazy(() =>
  import("./pages/DigitalTwin").then((m) => ({ default: m.DigitalTwin }))
);
const CommandCenter = lazy(() =>
  import("./pages/CommandCenter").then((m) => ({ default: m.CommandCenter }))
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
        <BrowserRouter>
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/join" element={<Join />} />
              <Route path="/register/:role" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
  path="/shop"
  element={
    <ProtectedRoute role="consumer">
      <Shop />
    </ProtectedRoute>
  }
/>
              <Route
  path="/shop/:id"
  element={
    <ProtectedRoute role="consumer">
      <ProductPage />
    </ProtectedRoute>
  }
/>
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
                path="/farmer"
                element={
                  <ProtectedRoute role="farmer">
                    <FarmerShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<FarmerDashboard />} />
                <Route path="sell" element={<SellProduce />} />
                <Route path="produce" element={<FarmerProduce />} />
                <Route path="products/:id" element={<FarmerProductInfo />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="orders" element={<FarmerOrdersPage />} />
                <Route path="earnings" element={<EarningsPage />} />
                <Route path="market" element={<MarketPage />} />
                <Route path="predictions" element={<PredictionsPage />} />
                <Route path="logistics" element={<LogisticsPage />} />
                <Route path="collaborations" element={<CollabPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<FarmerProfilePage />} />
                <Route
                  path="settings"
                  element={
                    <FarmerFeature
                      kicker="Settings"
                      title="Farm settings"
                      body="Language, payout account, and alert thresholds. Price alerts are stored in PostgreSQL."
                    />
                  }
                />
                <Route
                  path="schemes"
                  element={
                    <FarmerFeature
                      kicker="Support"
                      title="Government schemes"
                      body="A personalised feed of subsidies, crop insurance, and FPO programmes matched to your district and produce."
                    />
                  }
                />
                <Route path="advisory" element={<AiAdvisory />} />
                <Route
                  path="community"
                  element={
                    <FarmerFeature
                      kicker="Community"
                      title="Forums & training"
                      body="Ask other farmers, watch training videos, and keep a help-center chatbot for logistics questions."
                    />
                  }
                />
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
  path="/logistics"
  element={
    <ProtectedRoute role="logistics">
      <LogisticsDashboard />
    </ProtectedRoute>
  }
/>
              <Route
                path="/logistics/jobs"
                element={
                  <ProtectedRoute role="logistics">
                    <LogisticsJobs />
                  </ProtectedRoute>
                }
              />
              <Route
  path="/logistics/tracker/:jobId"
  element={
    <ProtectedRoute role="logistics">
      <LogisticsTracker />
    </ProtectedRoute>
  }
/>
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin">
                    <CommandCenter />
                  </ProtectedRoute>
                }
              />
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
        </BrowserRouter>
      </AppProvider>
    </I18nProvider>
  );
}
