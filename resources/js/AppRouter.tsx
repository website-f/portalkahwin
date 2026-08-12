import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import { DialogProvider } from './context/DialogContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { trackPageView } from './lib/tracking';

import { TemplatesGallery } from './pages/TemplatesGallery';
import { TemplatePreviewPage } from './pages/TemplatePreviewPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { PublicCard } from './pages/PublicCard';
import { GuestSeat } from './pages/GuestSeat';

import { AppLayout } from './pages/app/AppLayout';
import { MyCards } from './pages/app/MyCards';
import { AppTemplates } from './pages/app/AppTemplates';
import { CardEditor } from './pages/app/CardEditor';
import { GuestList } from './pages/app/GuestList';
import { SeatingPage } from './pages/app/SeatingPage';
import { CheckInScanner } from './pages/app/CheckInScanner';
import { Passes } from './pages/app/Passes';
import { Checkout } from './pages/app/Checkout';
import { CheckoutReturn } from './pages/app/CheckoutReturn';
import { Subscription } from './pages/app/Subscription';
import { ChangePassword } from './pages/app/ChangePassword';
import { PendingApproval } from './pages/app/PendingApproval';
import { MyStorage } from './pages/app/MyStorage';
import { CompanyProfile } from './pages/app/CompanyProfile';
import { Designer } from './pages/app/Designer';
import { MyDesigns } from './pages/app/MyDesigns';
import { Cart } from './pages/app/Cart';
import { Saved } from './pages/app/Saved';
import { Purchases } from './pages/app/Purchases';

import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminUserDetail } from './pages/admin/AdminUserDetail';
import { AdminTemplates } from './pages/admin/AdminTemplates';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminApprovals } from './pages/admin/AdminApprovals';
import { AdminFinance } from './pages/admin/AdminFinance';
import { WebTraffic } from './pages/admin/WebTraffic';

function RouteTracker() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
        trackPageView(pathname);
    }, [pathname]);
    return null;
}

export default function AppRouter() {
    return (
        <LangProvider>
        <AuthProvider>
        <CartProvider>
        <DialogProvider>
            <BrowserRouter>
                <RouteTracker />
                <Routes>
                    {/* Public — home is the template collection (no separate landing) */}
                    <Route path="/" element={<TemplatesGallery />} />
                    <Route path="/templates" element={<Navigate to="/" replace />} />
                    <Route path="/templates/:key" element={<TemplatePreviewPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/e/:slug" element={<PublicCard />} />
                    <Route path="/e/:slug/meja/:guestId" element={<GuestSeat />} />

                    {/* User panel */}
                    <Route path="/panel" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                        <Route index element={<MyCards />} />
                        <Route path="templates" element={<AppTemplates />} />
                        <Route path="cart" element={<Cart />} />
                        <Route path="saved" element={<Saved />} />
                        <Route path="purchases" element={<Purchases />} />
                        <Route path="designs" element={<MyDesigns />} />
                        <Route path="designer" element={<Designer />} />
                        <Route path="designer/:id" element={<Designer />} />
                        <Route path="cards/:id/edit" element={<CardEditor />} />
                        <Route path="cards/:id/guests" element={<GuestList />} />
                        <Route path="cards/:id/seating" element={<SeatingPage />} />
                        <Route path="cards/:id/checkin" element={<CheckInScanner />} />
                        <Route path="cards/:id/passes" element={<Passes />} />
                        <Route path="checkout" element={<Checkout />} />
                        <Route path="checkout/return" element={<CheckoutReturn />} />
                        <Route path="subscription" element={<Subscription />} />
                        <Route path="storage" element={<MyStorage />} />
                        <Route path="profile" element={<CompanyProfile />} />
                        <Route path="pending" element={<PendingApproval />} />
                        <Route path="change-password" element={<ChangePassword />} />
                    </Route>

                    {/* Admin panel */}
                    <Route path="/admin" element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="users/:id" element={<AdminUserDetail />} />
                        <Route path="templates" element={<AdminTemplates />} />
                        <Route path="designer" element={<Designer />} />
                        <Route path="designer/:id" element={<Designer />} />
                        <Route path="settings" element={<AdminSettings />} />
                        <Route path="approvals" element={<AdminApprovals />} />
                        <Route path="finance" element={<AdminFinance />} />
                        <Route path="traffic" element={<WebTraffic />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </DialogProvider>
        </CartProvider>
        </AuthProvider>
        </LangProvider>
    );
}
