import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import { DialogProvider } from './context/DialogContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { trackPageView } from './lib/tracking';

import { Landing } from './pages/Landing';
import { TemplatesGallery } from './pages/TemplatesGallery';
import { TemplatePreviewPage } from './pages/TemplatePreviewPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { PublicCard } from './pages/PublicCard';

import { AppLayout } from './pages/app/AppLayout';
import { MyCards } from './pages/app/MyCards';
import { AppTemplates } from './pages/app/AppTemplates';
import { CardEditor } from './pages/app/CardEditor';
import { GuestList } from './pages/app/GuestList';
import { SeatingPage } from './pages/app/SeatingPage';
import { CheckInScanner } from './pages/app/CheckInScanner';
import { Passes } from './pages/app/Passes';
import { Upgrade } from './pages/app/Upgrade';
import { CheckoutReturn } from './pages/app/CheckoutReturn';
import { Subscription } from './pages/app/Subscription';
import { ChangePassword } from './pages/app/ChangePassword';

import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminUserDetail } from './pages/admin/AdminUserDetail';
import { AdminTemplates } from './pages/admin/AdminTemplates';
import { AdminSettings } from './pages/admin/AdminSettings';
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
        <DialogProvider>
            <BrowserRouter>
                <RouteTracker />
                <Routes>
                    {/* Public */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/templates" element={<TemplatesGallery />} />
                    <Route path="/templates/:key" element={<TemplatePreviewPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/e/:slug" element={<PublicCard />} />

                    {/* User panel */}
                    <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                        <Route index element={<MyCards />} />
                        <Route path="templates" element={<AppTemplates />} />
                        <Route path="cards/:id/edit" element={<CardEditor />} />
                        <Route path="cards/:id/guests" element={<GuestList />} />
                        <Route path="cards/:id/seating" element={<SeatingPage />} />
                        <Route path="cards/:id/checkin" element={<CheckInScanner />} />
                        <Route path="cards/:id/passes" element={<Passes />} />
                        <Route path="upgrade" element={<Upgrade />} />
                        <Route path="checkout/return" element={<CheckoutReturn />} />
                        <Route path="subscription" element={<Subscription />} />
                        <Route path="change-password" element={<ChangePassword />} />
                    </Route>

                    {/* Admin panel */}
                    <Route path="/admin" element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="users/:id" element={<AdminUserDetail />} />
                        <Route path="templates" element={<AdminTemplates />} />
                        <Route path="settings" element={<AdminSettings />} />
                        <Route path="traffic" element={<WebTraffic />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </DialogProvider>
        </AuthProvider>
        </LangProvider>
    );
}
