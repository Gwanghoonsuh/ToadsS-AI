import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, LoginCredentials, RegisterData } from '../services/auth';
import { User } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                if (authService.isAuthenticated()) {
                    const currentUser = await authService.getCurrentUser();
                    setUser(currentUser);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                authService.logout();
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (credentials: LoginCredentials) => {
        try {
            setLoading(true);
            const user = await authService.login(credentials);
            setUser(user);
            toast.success('로그인되었습니다.');
        } catch (error: any) {
            const message = error.response?.data?.error || error.message || '로그인에 실패했습니다.';
            toast.error(typeof message === 'string' ? message : '로그인에 실패했습니다.');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const register = async (data: RegisterData) => {
        try {
            setLoading(true);
            const user = await authService.register(data);
            setUser(user);
            toast.success('회원가입이 완료되었습니다.');
        } catch (error: any) {
            const message = error.response?.data?.error || error.message || '회원가입에 실패했습니다.';
            toast.error(typeof message === 'string' ? message : '회원가입에 실패했습니다.');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        toast.success('로그아웃되었습니다.');
    };

    const value: AuthContextType = {
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
