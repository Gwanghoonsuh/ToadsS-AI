import { useState, useEffect, useCallback } from 'react';
import { documentsAPI } from '../services/api';
import { Document } from '../types';
import toast from 'react-hot-toast';

export const useDocuments = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchDocuments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await documentsAPI.getDocuments();
            setDocuments(response.documents);
        } catch (error: any) {
            const message = error.response?.data?.error || error.message || '문서 목록을 불러오는데 실패했습니다.';
            toast.error(typeof message === 'string' ? message : '문서 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    const uploadDocument = useCallback(async (file: File) => {
        try {
            setUploading(true);
            const response = await documentsAPI.uploadDocument(file);

            if (response.success) {
                toast.success(`${file.name} 업로드가 완료되었습니다.`);

                // Add a small delay to ensure server processing is complete
                setTimeout(async () => {
                    try {
                        await fetchDocuments(); // Refresh the list
                    } catch (refreshError) {
                        console.error('Failed to refresh document list:', refreshError);
                        toast.error('문서 목록을 새로고침하는데 실패했습니다.');
                    }
                }, 1000);
            }

            return response;
        } catch (error: any) {
            const message = error.response?.data?.error || error.message || '파일 업로드에 실패했습니다.';
            toast.error(typeof message === 'string' ? message : '파일 업로드에 실패했습니다.');
            throw error;
        } finally {
            setUploading(false);
        }
    }, [fetchDocuments]);

    const uploadDocuments = useCallback(async (files: File[]) => {
        try {
            setUploading(true);
            const response = await documentsAPI.uploadDocuments(files);

            if (response.success) {
                const successCount = response.documents?.length || 0;
                const errorCount = response.errors?.length || 0;

                if (successCount > 0) {
                    toast.success(`${successCount}개 파일 업로드가 완료되었습니다.`);
                }

                if (errorCount > 0) {
                    toast.error(`${errorCount}개 파일 업로드에 실패했습니다.`);
                }

                // Add a small delay to ensure server processing is complete
                setTimeout(async () => {
                    try {
                        await fetchDocuments(); // Refresh the list
                    } catch (refreshError) {
                        console.error('Failed to refresh document list:', refreshError);
                        toast.error('문서 목록을 새로고침하는데 실패했습니다.');
                    }
                }, 1000);
            }

            return response;
        } catch (error: any) {
            const message = error.response?.data?.error || error.message || '파일 업로드에 실패했습니다.';
            toast.error(typeof message === 'string' ? message : '파일 업로드에 실패했습니다.');
            throw error;
        } finally {
            setUploading(false);
        }
    }, [fetchDocuments]);

    const deleteDocument = useCallback(async (documentId: string): Promise<void> => {
        try {
            const response = await documentsAPI.deleteDocument(documentId);

            if (response.success) {
                toast.success('문서가 삭제되었습니다.');
                await fetchDocuments(); // Refresh the list
            } else {
                throw new Error(response.message || '문서 삭제에 실패했습니다.');
            }
        } catch (error: any) {
            const message = error.response?.data?.error || error.message || '문서 삭제에 실패했습니다.';
            toast.error(typeof message === 'string' ? message : '문서 삭제에 실패했습니다.');
            throw error;
        }
    }, [fetchDocuments]);

    const downloadDocument = useCallback(async (documentId: string, fileName: string) => {
        try {
            const blob = await documentsAPI.downloadDocument(documentId);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('파일 다운로드가 시작되었습니다.');
        } catch (error: any) {
            const message = error.response?.data?.error || error.message || '파일 다운로드에 실패했습니다.';
            toast.error(typeof message === 'string' ? message : '파일 다운로드에 실패했습니다.');
            throw error;
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    return {
        documents,
        loading,
        uploading,
        fetchDocuments,
        uploadDocument,
        uploadDocuments,
        deleteDocument,
        downloadDocument,
    };
};
