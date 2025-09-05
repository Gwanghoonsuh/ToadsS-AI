import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    XMarkIcon,
    CloudArrowUpIcon,
    DocumentIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';


interface DocumentUploadProps {
    onClose: () => void;
    onSingleUpload: (file: File) => Promise<void>;
    onMultipleUpload: (files: File[]) => Promise<void>;
    uploading: boolean;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
    onClose,
    onSingleUpload,
    onMultipleUpload,
    uploading
}) => {
    const [uploadMode, setUploadMode] = useState<'single' | 'multiple'>('single');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setSelectedFiles(acceptedFiles);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.hancom.hwp': ['.hwp'],
            'application/vnd.hancom.hwpx': ['.hwp'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/tiff': ['.tiff'],
            'text/plain': ['.txt'],
            'application/rtf': ['.rtf'],
        },
        maxSize: 50 * 1024 * 1024, // 50MB
        multiple: uploadMode === 'multiple',
    });

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        try {
            if (uploadMode === 'single') {
                await onSingleUpload(selectedFiles[0]);
            } else {
                await onMultipleUpload(selectedFiles);
            }
            setSelectedFiles([]);
        } catch (error) {
            // Error is handled in the hook
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">문서 업로드</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Upload Mode Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            업로드 모드
                        </label>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setUploadMode('single')}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${uploadMode === 'single'
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                단일 파일
                            </button>
                            <button
                                onClick={() => setUploadMode('multiple')}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${uploadMode === 'multiple'
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                다중 파일
                            </button>
                        </div>
                    </div>

                    {/* Drop Zone */}
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${isDragActive
                            ? 'border-primary-400 bg-primary-50'
                            : 'border-gray-300 hover:border-gray-400'
                            }`}
                    >
                        <input {...getInputProps()} />
                        <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                            {isDragActive ? '파일을 여기에 놓으세요' : '파일을 드래그하거나 클릭하여 선택하세요'}
                        </p>
                        <p className="text-sm text-gray-500">
                            PDF, DOC, DOCX, HWP, JPG, PNG, TIFF, TXT, RTF 파일 지원 (최대 50MB)
                        </p>
                    </div>

                    {/* Selected Files */}
                    {selectedFiles.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-3">
                                선택된 파일 ({selectedFiles.length}개)
                            </h3>
                            <div className="space-y-2">
                                {selectedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <DocumentIcon className="w-5 h-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Warning */}
                    <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                            <p className="font-medium mb-1">주의사항</p>
                            <ul className="space-y-1 text-xs">
                                <li>• 업로드된 문서는 AI 검색에 활용됩니다</li>
                                <li>• 민감한 정보가 포함된 문서는 업로드하지 마세요</li>
                                <li>• 문서 색인에는 몇 분이 소요될 수 있습니다</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={selectedFiles.length === 0 || uploading}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {uploading ? (
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                업로드 중...
                            </div>
                        ) : (
                            `업로드 (${selectedFiles.length}개)`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentUpload;
