import { useRef } from 'react';
import { Mic, Paperclip, Folder, Send, Square } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onStop: () => void;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDir: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVoice: () => void;
  loading: boolean;
  placeholder?: string;
}

export default function ChatInput({ value, onChange, onSend, onStop, onFile, onDir, onVoice, loading, placeholder }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      <div className="flex items-center gap-1.5">
        {/* Voice */}
        <button onClick={onVoice}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="语音输入">
          <Mic className="w-4 h-4" />
        </button>

        {/* File */}
        <button onClick={() => fileRef.current?.click()}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="上传文件">
          <Paperclip className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={onFile} accept=".txt,.md,.json,.csv,.pdf,.doc,.docx" />

        {/* Folder */}
        <button onClick={() => dirRef.current?.click()}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="上传文件夹">
          <Folder className="w-4 h-4" />
        </button>
        <input ref={dirRef} type="file" className="hidden" onChange={onDir} {...{ webkitdirectory: "" } as any} multiple />

        {/* Text input */}
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "输入消息..."}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />

        {/* Send / Stop */}
        {loading ? (
          <button onClick={onStop}
            className="p-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            title="停止">
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={onSend} disabled={!value.trim()}
            className="p-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="发送">
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
