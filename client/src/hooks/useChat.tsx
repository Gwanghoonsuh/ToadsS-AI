import { useState, useCallback } from 'react';
import { chatAPI } from '../services/api';
import { ChatMessage } from '../types';
import toast from 'react-hot-toast';

export const useChat = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: content.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        try {
            const response = await chatAPI.sendMessage(content);

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: response.answer,
                timestamp: new Date(),
                references: response.references,
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error: any) {
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다. 다시 시도해 주세요.',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, errorMessage]);

            const message = error.response?.data?.error || error.message || '메시지 전송에 실패했습니다.';
            toast.error(typeof message === 'string' ? message : '메시지 전송에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const newChat = useCallback(() => {
        clearMessages();
        toast.success('새 대화를 시작합니다.');
    }, [clearMessages]);

    return {
        messages,
        loading,
        sendMessage,
        clearMessages,
        newChat,
    };
};
