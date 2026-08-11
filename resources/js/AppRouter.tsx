import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
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
import { CardEditor } from './pages/app/CardEditor';
import { GuestList } from './pages/app/GuestList';
import { SeatingPage } from './pages/app/SeatingPage';
import { CheckInScanner } from './pages/app/CheckInScanner';
import { Passes } from './pages/app/Passes';
import { Upgrade } from './pages/app/Upgrade';
import { CheckoutReturn } from './pages/app/CheckoutReturn';

import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminTemplates } from './pages/admin/AdminTemplates';

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
                        <Route path="cards/:id/edit" element={<CardEditor />} />
                        <Route path="cards/:id/guests" element={<GuestList />} />
                        <Route path="cards/:id/seating" element={<SeatingPage />} />
                        <Route path="cards/:id/checkin" element={<CheckInScanner />} />
                        <Route path="cards/:id/passes" element={<Passes />} />
                        <Route path="upgrade" element={<Upgrade />} />
                        <Route path="checkout/return" element={<CheckoutReturn />} />
                    </Route>

                    {/* Admin panel */}
                    <Route path="/admin" element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="templates" element={<AdminTemplates />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
        </LangProvider>
    );
}
