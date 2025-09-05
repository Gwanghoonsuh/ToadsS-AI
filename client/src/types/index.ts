export interface User {
    id: string; // 이메일
    email: string; // 이메일 (id와 동일)
    name: string; // 사용자 이름
    customerId: number; // 회사 코드
    companyName: string; // 회사명
}

export interface AuthResponse {
    success: boolean;
    token: string;
    user: User;
}

export interface ChatMessage {
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    references?: DocumentReference[];
}

export interface DocumentReference {
    id: number;
    name: string;
    uri: string;
    score: number;
}

export interface ChatResponse {
    success: boolean;
    answer: string;
    references: DocumentReference[];
    searchResults: SearchResult[];
}

export interface SearchResult {
    title: string;
    content: string;
    score: number;
}

export interface Document {
    id: string;
    name: string;
    size: number;
    uploadedAt: string;
    contentType: string;
    sizeFormatted: string;
}

export interface DocumentsResponse {
    success: boolean;
    documents: Document[];
}

export interface UploadResponse {
    success: boolean;
    message: string;
    document?: Document;
    documents?: Document[];
    errors?: Array<{
        name: string;
        error: string;
        success: false;
    }>;
}

export interface ApiError {
    error: string;
    stack?: string;
}
