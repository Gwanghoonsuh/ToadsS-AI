import React from 'react';
import {
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    PlusIcon,
    BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';

interface SidebarProps {
    isActive: (path: string) => boolean;
    navigate: (path: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isActive, navigate }) => {
    const { user } = useAuth();
    const { newChat } = useChat();

    const handleNewChat = () => {
        newChat();
        navigate('/');
    };

    return (
        <div className="w-64 bg-white shadow-lg flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-maritime-600 rounded-lg flex items-center justify-center">
                        <BuildingOfficeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">ToadsAI</h1>
                        <p className="text-xs text-gray-500">Maritime Agent</p>
                    </div>
                </div>
            </div>

            {/* Company Info */}
            <div className="p-4 border-b border-gray-200">
                <div className="text-sm text-gray-600">
                    <p className="font-medium text-gray-900">{user?.companyName}</p>
                    <p className="text-gray-500">{user?.name}</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                {/* New Chat Button */}
                <button
                    onClick={handleNewChat}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors duration-200 btn-hover"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>새 대화</span>
                </button>

                {/* Menu Items */}
                <div className="space-y-1">
                    <button
                        onClick={() => navigate('/')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive('/')
                                ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                        <span>AI 채팅</span>
                    </button>

                    <button
                        onClick={() => navigate('/documents')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive('/documents')
                                ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <DocumentTextIcon className="w-5 h-5" />
                        <span>문서 관리</span>
                    </button>
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                    <p>© 2024 ToadsAI</p>
                    <p>Maritime AI Assistant</p>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
