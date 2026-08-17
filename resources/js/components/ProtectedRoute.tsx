import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, isStaff } from '../context/AuthContext';

/**
 * Route gate. `admin` restricts to staff. `roles` restricts a /panel/* page to
 * specific account roles (staff always pass, so an admin can still inspect) — a
 * plain user typing a vendor/affiliate URL is bounced back to their dashboard.
 */
export function ProtectedRoute({ children, admin, roles }: { children: ReactNode; admin?: boolean; roles?: string[] }) {
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
    if (admin && !isStaff(user)) return <Navigate to="/panel" replace />;

    // Pending vendor/affiliate accounts wait for approval before using the app.
    if (user.status === 'pending' && !location.pathname.endsWith('/pending')) {
        return <Navigate to="/panel/pending" replace />;
    }

    // Role-scoped panel page: only the intended role(s) (or staff) may open it.
    if (roles && roles.length > 0 && !isStaff(user) && !roles.includes(user.role ?? '')) {
        return <Navigate to="/panel" replace />;
    }

    // Forced password change after an admin reset — allow only the change-password page.
    if (user.must_change_password && !location.pathname.endsWith('/change-password')) {
        return <Navigate to="/panel/change-password" replace />;
    }

    return <>{children}</>;
}
