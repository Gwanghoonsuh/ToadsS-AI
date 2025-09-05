import React from 'react';
import { DocumentReference } from '../types';
import { DocumentTextIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface ReferencesListProps {
    references: DocumentReference[];
}

const ReferencesList: React.FC<ReferencesListProps> = ({ references }) => {
    if (!references || references.length === 0) {
        return null;
    }

    const handleReferenceClick = (reference: DocumentReference) => {
        // In a real implementation, this would open the document or navigate to it
        console.log('Reference clicked:', reference);
        // For now, we'll just show an alert
        alert(`문서 "${reference.name}"을(를) 열려고 합니다.\n\n실제 구현에서는 해당 문서를 열거나 다운로드할 수 있습니다.`);
    };

    return (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
                <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">참조 문서</span>
            </div>

            <div className="space-y-2">
                {references.map((reference) => (
                    <button
                        key={reference.id}
                        onClick={() => handleReferenceClick(reference)}
                        className="w-full flex items-center justify-between p-2 text-left bg-white rounded border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200 group"
                    >
                        <div className="flex items-center space-x-3">
                            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                [{reference.id}]
                            </span>
                            <span className="text-sm text-gray-700 group-hover:text-blue-900">
                                {reference.name}
                            </span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                                {Math.round(reference.score * 100)}% 일치
                            </span>
                            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                        </div>
                    </button>
                ))}
            </div>

            <p className="text-xs text-blue-700 mt-2">
                클릭하여 원본 문서를 확인할 수 있습니다.
            </p>
        </div>
    );
};

export default ReferencesList;
