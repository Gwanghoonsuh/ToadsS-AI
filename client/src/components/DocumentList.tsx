import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
    TrashIcon,
    ArrowDownTrayIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import { Document } from '../types';

interface DocumentListProps {
    documents: Document[];
    onDelete: (documentId: string) => Promise<void>;
    onDownload: (documentId: string, fileName: string) => Promise<void>;
}

const DocumentList: React.FC<DocumentListProps> = ({
    documents,
    onDelete,
    onDownload
}) => {
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return '날짜 정보 없음';
            }
            return format(date, 'yyyy년 M월 d일 HH:mm', { locale: ko });
        } catch (error) {
            console.warn('Date formatting error:', error);
            return '날짜 정보 없음';
        }
    };
    const getFileIcon = (contentType?: string, fileName?: string) => {
        const type = contentType || fileName || '';
        if (type.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')) {
            return '📄';
        } else if (type.includes('word') || type.includes('document') || fileName?.toLowerCase().match(/\.(doc|docx)$/)) {
            return '📝';
        } else if (type.includes('image') || fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp)$/)) {
            return '🖼️';
        } else if (type.includes('text') || fileName?.toLowerCase().endsWith('.txt')) {
            return '📃';
        } else {
            return '📄';
        }
    };

    const getFileTypeColor = (contentType?: string, fileName?: string) => {
        const type = contentType || fileName || '';
        if (type.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')) {
            return 'bg-red-100 text-red-800';
        } else if (type.includes('word') || type.includes('document') || fileName?.toLowerCase().match(/\.(doc|docx)$/)) {
            return 'bg-blue-100 text-blue-800';
        } else if (type.includes('image') || fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp)$/)) {
            return 'bg-green-100 text-green-800';
        } else if (type.includes('text') || fileName?.toLowerCase().endsWith('.txt')) {
            return 'bg-gray-100 text-gray-800';
        } else {
            return 'bg-gray-100 text-gray-800';
        }
    };

    const getFileTypeName = (contentType?: string, fileName?: string) => {
        const type = contentType || fileName || '';
        if (type.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')) return 'PDF';
        if (type.includes('word') || fileName?.toLowerCase().match(/\.(doc|docx)$/)) return 'Word';
        if (type.includes('image') || fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp)$/)) return 'Image';
        if (type.includes('text') || fileName?.toLowerCase().endsWith('.txt')) return 'Text';
        return 'Document';
    };

    return (
        <div className="space-y-4">
            {documents.map((document) => (
                <div
                    key={document.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200"
                >
                    <div className="flex items-center space-x-4 flex-1">
                        {/* File Icon */}
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">{getFileIcon(document.contentType, document.name)}</span>
                            </div>
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                    {document.name}
                                </h3>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(document.contentType, document.name)}`}>
                                    {getFileTypeName(document.contentType, document.name)}
                                </span>
                            </div>

                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>{document.sizeFormatted}</span>
                                <span>•</span>
                                <span>
                                    {formatDate(document.uploadedAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => onDownload(document.id, document.name)}
                            className="p-2 text-gray-400 hover:text-primary-600 transition-colors duration-200"
                            title="다운로드"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => {
                                // In a real implementation, this would open a preview modal
                                alert(`문서 "${document.name}" 미리보기를 열려고 합니다.\n\n실제 구현에서는 문서 미리보기 모달이 열립니다.`);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                            title="미리보기"
                        >
                            <EyeIcon className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => {
                                if (window.confirm(`"${document.name}" 문서를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
                                    onDelete(document.id);
                                }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                            title="삭제"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DocumentList;
