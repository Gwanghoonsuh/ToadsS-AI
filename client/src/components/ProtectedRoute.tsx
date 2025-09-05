import React from 'react';
import { useAuth } from '../hooks/useAuth';
import LoginPage from '../pages/LoginPage';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // 메인 페이지에서 인증되지 않은 사용자에게는 로그인 페이지를 직접 표시
        return <LoginPage />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
