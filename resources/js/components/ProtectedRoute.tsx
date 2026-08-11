import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, admin }: { children: ReactNode; admin?: boolean }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    if (admin && user.role !== 'admin') return <Navigate to="/app" replace />;

    // Forced password change after an admin reset — allow only the change-password page.
    if (user.must_change_password && !location.pathname.endsWith('/change-password')) {
        return <Navigate to="/app/change-password" replace />;
    }

    return <>{children}</>;
}
