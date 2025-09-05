import React, { useState } from 'react';
import {
    UserCircleIcon,
    ChevronDownIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types';

interface HeaderProps {
    user: User | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
    const { logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    const handleLogout = () => {
        logout();
        setShowDropdown(false);
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Title and Company Info */}
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Maritime AI Partner
                        </h1>
                        <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-gray-500">
                                해운업계 전문 AI 어시스턴트
                            </p>
                            {user?.companyName && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-400">|</span>
                                    <span className="text-sm font-medium text-primary-600">
                                        {user.companyName}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center space-x-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200"
                        >
                            <UserCircleIcon className="w-6 h-6 text-gray-400" />
                            <div className="text-left">
                                <p className="font-medium">{user?.name}</p>
                                <p className="text-xs text-gray-500">{user?.companyName}</p>
                            </div>
                            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                        </button>

                        {/* Dropdown Menu */}
                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                <div className="px-4 py-2 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                >
                                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                                    <span>로그아웃</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Click outside to close dropdown */}
            {showDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                />
            )}
        </header>
    );
};

export default Header;
