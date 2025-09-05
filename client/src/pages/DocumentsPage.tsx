import React, { useState } from 'react';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../hooks/useAuth';
import DocumentUpload from '../components/DocumentUpload';
import DocumentList from '../components/DocumentList';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const DocumentsPage: React.FC = () => {
    const { documents, loading, uploading, uploadDocument, uploadDocuments, deleteDocument, downloadDocument } = useDocuments();
    const { user } = useAuth();
    const [showUpload, setShowUpload] = useState(false);

    const handleSingleUpload = async (file: File) => {
        await uploadDocument(file);
        setShowUpload(false);
    };

    const handleMultipleUpload = async (files: File[]) => {
        await uploadDocuments(files);
        setShowUpload(false);
    };

    return (
        <div className="h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">문서 관리</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {user?.companyName}의 문서를 관리하고 AI 검색에 활용하세요
                    </p>
                </div>

                <button
                    onClick={() => setShowUpload(true)}
                    className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200"
                >
                    문서 업로드
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                            <DocumentTextIcon className="w-6 h-6 text-primary-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">총 문서 수</p>
                            <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <DocumentTextIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">업로드 중</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {uploading ? '처리 중...' : '0'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">색인 완료</p>
                            <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Document List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">문서 목록</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        업로드된 문서들을 확인하고 관리할 수 있습니다
                    </p>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                            <span className="ml-3 text-gray-500">문서 목록을 불러오는 중...</span>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-12">
                            <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">문서가 없습니다</h3>
                            <p className="text-gray-500 mb-6">
                                첫 번째 문서를 업로드하여 AI 검색을 시작해보세요
                            </p>
                            <button
                                onClick={() => setShowUpload(true)}
                                className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200"
                            >
                                문서 업로드하기
                            </button>
                        </div>
                    ) : (
                        <DocumentList
                            documents={documents}
                            onDelete={deleteDocument}
                            onDownload={downloadDocument}
                        />
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <DocumentUpload
                    onClose={() => setShowUpload(false)}
                    onSingleUpload={handleSingleUpload}
                    onMultipleUpload={handleMultipleUpload}
                    uploading={uploading}
                />
            )}
        </div>
    );
};

export default DocumentsPage;
