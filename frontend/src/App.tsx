import { BrowserRouter, Routes, Route } from "react-router-dom";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import OffersPage from "./pages/OffersPage";
import Navbar from "./components/Navbar";
import MobileNav from "./components/MobileNav";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route
              path="/products/:productId"
              element={<ProductDetailPage />}
            />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route
              path="/order-confirmation/:orderId"
              element={<OrderConfirmationPage />}
            />
            <Route path="/orders" element={<OrderHistoryPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/offers" element={<OffersPage />} />
            {/* <Route path="/admin" element={<AdminDashboardPage />} /> */}
          </Routes>
          <MobileNav />
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

function NavItem({ label, active }: any) {
  return (
    <div
      className={`px-4 py-2 rounded-full text-sm ${
        active ? "bg-yellow-300 text-black" : ""
      }`}
    >
      {label}
    </div>
  );
}
