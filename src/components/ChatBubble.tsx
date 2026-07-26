import { Bot, User } from 'lucide-react';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  agentName?: string;
}

export default function ChatBubble({ role, content, agentName }: Props) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser
          ? 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && agentName && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">{agentName}</div>
        )}
        <div className={`rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-gray-900 text-white rounded-tr-md'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-md border border-gray-200 dark:border-gray-700'
        }`}>
          <div className="markdown-body text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    </div>
  );
}
