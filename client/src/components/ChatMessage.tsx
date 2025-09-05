import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { UserIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { ChatMessage as ChatMessageType } from '../types';
import ReferencesList from './ReferencesList';

interface ChatMessageProps {
    message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.type === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUser
                        ? 'bg-primary-100'
                        : 'bg-gradient-to-br from-primary-500 to-maritime-600'
                        }`}>
                        {isUser ? (
                            <UserIcon className="w-5 h-5 text-primary-600" />
                        ) : (
                            <CpuChipIcon className="w-5 h-5 text-white" />
                        )}
                    </div>
                </div>

                {/* Message Content */}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Message Bubble */}
                    <div className={`px-4 py-3 rounded-2xl ${isUser
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                        }`}>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                        </div>
                    </div>

                    {/* References */}
                    {!isUser && message.references && message.references.length > 0 && (
                        <div className="mt-3 w-full">
                            <ReferencesList references={message.references} />
                        </div>
                    )}

                    {/* Timestamp */}
                    <div className={`mt-1 text-xs text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
                        {format(new Date(message.timestamp), 'HH:mm', { locale: ko })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatMessage;
