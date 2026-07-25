import { Eye } from 'lucide-react';

interface Props {
  msg: { role: string; text: string; artifact?: string; downloadUrl?: string };
  streaming?: boolean;
  onPreview?: (url: string, label: string) => void;
}

export default function ChatMessage({ msg, streaming, onPreview }: Props) {
  const isUser = msg.role === 'user';
  const isStreaming = streaming && !isUser;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-blue-500 text-white rounded-br-md'
          : 'bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 rounded-bl-md'
      }`}>
        {/* Agent name badge */}
        {!isUser && msg.role && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wider">
            {msg.role}
          </div>
        )}

        {/* Text content */}
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {msg.text}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>

        {/* Artifact download/preview */}
        {msg.artifact && msg.downloadUrl && (
          <div className="mt-2 pt-2 border-t border-gray-200/30 dark:border-gray-600/30 flex items-center gap-2">
            <span className="text-xs truncate max-w-[200px]">{msg.artifact}</span>
            {(msg.artifact.endsWith('.html') || msg.artifact.endsWith('.htm')) && onPreview && (
              <button
                onClick={() => onPreview(msg.downloadUrl!, msg.artifact!)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-xs transition-colors"
              >
                <Eye className="w-3 h-3" /> 预览
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
