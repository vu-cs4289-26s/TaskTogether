'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { User } from '@/types/user';
import { getCurrentUser } from '@/lib/user';
import { loginMock, registerMock, clearMockLogin } from '@/lib/mockAuth';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            setLoading(true);

            if (USE_MOCK) {
                try {
                    const u = await getCurrentUser();
                    if (!cancelled) setUser(u);
                } catch {
                    if (!cancelled) setUser(null);
                } finally {
                    if (!cancelled) setLoading(false);
                }
                return;
            }
            const token = localStorage.getItem('token');
            if (token) {
                api
                    .get('/users/me')
                    .then((res) => {
                        if (!cancelled) setUser(res.data.data);
                    })
                    .catch(() => localStorage.removeItem('token'))
                    .finally(() => {
                        if (!cancelled) setLoading(false);
                    });
            } else {
                setLoading(false);
            }
        }

        bootstrap();
        return () => {
            cancelled = true;
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        if (USE_MOCK) {
            await loginMock(email, password);
            const u = await getCurrentUser();
            setUser(u);
            return;
        }

        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.data.token);
        setUser(res.data.data.user);
    }, []);

    const register = useCallback(async (name: string, email: string, password: string) => {
        if (USE_MOCK) {
            await registerMock(name, email, password);
            const u = await getCurrentUser();
            setUser(u);
            return;
        }

        const res = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('token', res.data.data.token);
        setUser(res.data.data.user);
    }, []);

    const logout = useCallback(() => {
        if (USE_MOCK) {
            clearMockLogin();
            setUser(null);
            return;
        }

        localStorage.removeItem('token');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
