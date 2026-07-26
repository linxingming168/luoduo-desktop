import { Eye, Download, FileCode2 } from 'lucide-react';
import type { Artifact } from '../utils/artifact';
import { downloadArtifact } from '../utils/artifact';

interface Props {
  msg: { role: string; text: string; artifact?: Artifact };
  streaming?: boolean;
  onOpenArtifact?: (a: Artifact) => void;
}

export default function ChatMessage({ msg, streaming, onOpenArtifact }: Props) {
  const isUser = msg.role === 'user';
  const isStreaming = streaming && !isUser;
  const a = msg.artifact;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-gray-900 text-white rounded-br-md'
          : 'bg-gray-100 text-gray-900 rounded-bl-md'
      }`}>
        {/* 智能体名字 */}
        {!isUser && msg.role && (
          <div className="text-[10px] text-gray-500 mb-1 font-medium uppercase tracking-wider">
            {msg.role}
          </div>
        )}

        {/* 正文 */}
        {msg.text && (
          <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {msg.text}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-gray-900 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        )}
        {!msg.text && isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-gray-900 animate-pulse rounded-sm" />
        )}

        {/* 产物卡片：预览 / 下载 */}
        {a && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#ebebeb] bg-white px-3 py-2">
            <FileCode2 className="w-4 h-4 text-gray-700 flex-shrink-0" />
            <span className="text-xs text-gray-800 truncate flex-1" title={a.title}>{a.title}</span>
            {a.type === 'html' && onOpenArtifact && (
              <button
                onClick={() => onOpenArtifact(a)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs transition-colors flex-shrink-0"
              >
                <Eye className="w-3 h-3" /> 预览
              </button>
            )}
            <button
              onClick={() => downloadArtifact(a)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#ebebeb] hover:bg-gray-50 text-gray-700 text-xs transition-colors flex-shrink-0"
            >
              <Download className="w-3 h-3" /> 下载
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
