import { useState, useEffect } from 'react';
import { X, Download, Eye, Code2, RefreshCw } from 'lucide-react';
import type { Artifact } from '../utils/artifact';
import { downloadArtifact } from '../utils/artifact';

interface Props {
  artifact: Artifact;
  onClose: () => void;
}

// 右侧预览面板：HTML 直接在 iframe 里运行（可玩游戏），也可看源码 / 下载
export default function ArtifactPanel({ artifact, onClose }: Props) {
  const canPreview = artifact.type === 'html';
  const [tab, setTab] = useState<'preview' | 'code'>(canPreview ? 'preview' : 'code');
  const [reloadKey, setReloadKey] = useState(0);

  // 切换到不同产物时重置标签页并重跑
  useEffect(() => {
    setTab(canPreview ? 'preview' : 'code');
    setReloadKey(k => k + 1);
  }, [artifact.code, canPreview]);

  return (
    <div style={{
      width: '46%', minWidth: 360, maxWidth: 760,
      borderLeft: '1px solid #ebebeb', background: '#fff',
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* 头部 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderBottom: '1px solid #ebebeb', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {artifact.title}
        </span>

        {/* 预览 / 源码 切换 */}
        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 2, marginLeft: 4 }}>
          {canPreview && (
            <button onClick={() => setTab('preview')}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer',
                background: tab === 'preview' ? '#fff' : 'transparent', color: tab === 'preview' ? '#1a1a1a' : '#6b7280' }}>
              <Eye size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />预览
            </button>
          )}
          <button onClick={() => setTab('code')}
            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer',
              background: tab === 'code' ? '#fff' : 'transparent', color: tab === 'code' ? '#1a1a1a' : '#6b7280' }}>
            <Code2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />源码
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {canPreview && tab === 'preview' && (
          <button onClick={() => setReloadKey(k => k + 1)} title="重新运行"
            style={{ padding: 6, borderRadius: 8, border: '1px solid #ebebeb', background: '#fff', cursor: 'pointer', color: '#4b5563' }}>
            <RefreshCw size={14} />
          </button>
        )}
        <button onClick={() => downloadArtifact(artifact)} title="下载文件"
          style={{ padding: 6, borderRadius: 8, border: '1px solid #ebebeb', background: '#fff', cursor: 'pointer', color: '#4b5563' }}>
          <Download size={14} />
        </button>
        <button onClick={onClose} title="关闭预览"
          style={{ padding: 6, borderRadius: 8, border: '1px solid #ebebeb', background: '#fff', cursor: 'pointer', color: '#4b5563' }}>
          <X size={14} />
        </button>
      </div>

      {/* 主体 */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#fff' }}>
        {tab === 'preview' && canPreview ? (
          <iframe
            key={reloadKey}
            title={artifact.title}
            srcDoc={artifact.code}
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-forms allow-popups"
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
          />
        ) : (
          <pre style={{
            margin: 0, height: '100%', overflow: 'auto', padding: 16,
            fontSize: 12.5, lineHeight: 1.6, color: '#1a1a1a', background: '#fafafa',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            whiteSpace: 'pre', tabSize: 2,
          }}>
            <code>{artifact.code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
