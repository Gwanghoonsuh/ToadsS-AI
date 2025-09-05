import { authAPI } from './api';
import { User } from '../types';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    name: string;
    companyName: string;
}

class AuthService {
    private token: string | null = null;
    private user: User | null = null;

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        this.token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                this.user = JSON.parse(userStr);
            } catch (error) {
                console.error('Error parsing user from storage:', error);
                this.clearStorage();
            }
        }
    }

    private saveToStorage(token: string, user: User) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    private clearStorage() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
    }

    async login(credentials: LoginCredentials): Promise<User> {
        try {
            const response = await authAPI.login(credentials.email, credentials.password);
            this.token = response.token;
            this.user = response.user;
            this.saveToStorage(response.token, response.user);
            return response.user;
        } catch (error) {
            this.clearStorage();
            throw error;
        }
    }

    async register(data: RegisterData): Promise<User> {
        try {
            const response = await authAPI.register(
                data.email,
                data.password,
                data.name,
                data.companyName
            );
            this.token = response.token;
            this.user = response.user;
            this.saveToStorage(response.token, response.user);
            return response.user;
        } catch (error) {
            this.clearStorage();
            throw error;
        }
    }

    async getCurrentUser(): Promise<User | null> {
        if (!this.token || !this.user) {
            return null;
        }

        try {
            const response = await authAPI.getMe();
            this.user = response.user;
            this.saveToStorage(this.token, response.user);
            return response.user;
        } catch (error) {
            this.logout();
            return null;
        }
    }

    logout() {
        this.clearStorage();
    }

    isAuthenticated(): boolean {
        return !!this.token && !!this.user;
    }

    getToken(): string | null {
        return this.token;
    }

    getUser(): User | null {
        return this.user;
    }
}

export const authService = new AuthService();
