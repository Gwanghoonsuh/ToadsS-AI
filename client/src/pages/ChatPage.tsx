import React, { useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
// import ReferencesList from '../components/ReferencesList'; // 사용하지 않음
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

const ChatPage: React.FC = () => {
    const { messages, loading, sendMessage, clearMessages } = useChat();
    const { user } = useAuth();

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (content: string) => {
        await sendMessage(content);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">AI 채팅</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {user?.companyName}의 문서를 기반으로 질문해보세요
                    </p>
                </div>

                <div className="flex items-center space-x-4">
                    {/* Clear Messages Button */}
                    {messages.length > 0 && (
                        <button
                            onClick={clearMessages}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200"
                        >
                            대화 초기화
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Container */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                                <PaperAirplaneIcon className="w-8 h-8 text-primary-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                안녕하세요! 무엇을 도와드릴까요?
                            </h3>
                            <p className="text-gray-500 max-w-md">
                                업로드된 문서에 대해 질문하거나, 해운업계 관련 정보를 문의해보세요.
                            </p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <ChatMessage key={message.id} message={message} />
                        ))
                    )}

                    {loading && (
                        <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                            <span>답변을 생성하고 있습니다...</span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 p-6">
                    <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
