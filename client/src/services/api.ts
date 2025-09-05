import axios, { AxiosResponse } from 'axios';
import {
    AuthResponse,
    ChatResponse,
    DocumentsResponse,
    UploadResponse,
    User
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: async (email: string, password: string): Promise<AuthResponse> => {
        const response: AxiosResponse<AuthResponse> = await api.post('/auth/login', {
            email,
            password,
        });
        return response.data;
    },

    register: async (
        email: string,
        password: string,
        name: string,
        companyName: string
    ): Promise<AuthResponse> => {
        const response: AxiosResponse<AuthResponse> = await api.post('/auth/register', {
            email,
            password,
            name,
            companyName,
        });
        return response.data;
    },

    getMe: async (): Promise<{ success: boolean; user: User }> => {
        const response = await api.get('/auth/me');
        return response.data;
    },
};

// Chat API
export const chatAPI = {
    sendMessage: async (query: string, maxResults?: number): Promise<ChatResponse> => {
        const response: AxiosResponse<ChatResponse> = await api.post('/chat', {
            query,
            maxResults,
        });
        return response.data;
    },


};

// Documents API
export const documentsAPI = {
    getDocuments: async (): Promise<DocumentsResponse> => {
        const response: AxiosResponse<DocumentsResponse> = await api.get('/documents');
        return response.data;
    },

    uploadDocument: async (file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('document', file);

        const response: AxiosResponse<UploadResponse> = await api.post('/documents', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    uploadDocuments: async (files: File[]): Promise<UploadResponse> => {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('documents', file);
        });

        const response: AxiosResponse<UploadResponse> = await api.post('/documents/batch', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    deleteDocument: async (documentId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/documents/${documentId}`);
        return response.data;
    },

    downloadDocument: async (documentId: string): Promise<Blob> => {
        const response = await api.get(`/documents/${documentId}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },
};

export default api;
