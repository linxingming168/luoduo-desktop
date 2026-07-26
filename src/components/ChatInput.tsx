import { useRef } from 'react';
import { Mic, Paperclip, Folder, Music, Headphones, Send, Square } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onStop: () => void;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDir: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMusic: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenMusic: () => void;
  onVoice: () => void;
  loading: boolean;
  placeholder?: string;
}

export default function ChatInput({ value, onChange, onSend, onStop, onFile, onDir, onMusic, onOpenMusic, onVoice, loading, placeholder }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const musicRef = useRef<HTMLInputElement>(null);

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
        <input ref={fileRef} type="file" className="hidden" onChange={onFile} multiple
          accept=".txt,.md,.json,.csv,.tsv,.log,.xml,.yml,.yaml,.ini,.conf,.html,.htm,.css,.js,.ts,.tsx,.jsx,.py,.sh,.bat,.sql,.java,.c,.cpp,.h,.go,.rs,.php,.rb,.vue,.png,.jpg,.jpeg,.gif,.webp,.bmp" />

        {/* Folder */}
        <button onClick={() => dirRef.current?.click()}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="上传文件夹">
          <Folder className="w-4 h-4" />
        </button>
        <input ref={dirRef} type="file" className="hidden" onChange={onDir} {...{ webkitdirectory: "" } as any} multiple />

        {/* Music: 本地音乐文件（绝对合规，零外部依赖） */}
        <button onClick={() => musicRef.current?.click()}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="选择本地音乐">
          <Music className="w-4 h-4" />
        </button>
        <input ref={musicRef} type="file" className="hidden" onChange={onMusic}
          accept=".mp3,.ogg,.wav,.m4a,.flac,.aac" />

        {/* Open music: 开放/合规音源（AudioLib 原创可商用） */}
        <button onClick={onOpenMusic}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="开放音乐（AudioLib）">
          <Headphones className="w-4 h-4" />
        </button>

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
