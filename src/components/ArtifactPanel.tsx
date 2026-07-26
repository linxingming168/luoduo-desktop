import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Eye, Code2, RefreshCw, Copy, Check } from 'lucide-react';
import type { Artifact } from '../utils/artifact';
import { downloadArtifact, buildPreviewDoc, copyArtifactCode } from '../utils/artifact';

interface Props {
  artifact: Artifact;
  onClose: () => void;
}

const btnStyle: React.CSSProperties = {
  padding: 6, borderRadius: 8, border: '1px solid #ebebeb',
  background: '#fff', cursor: 'pointer', color: '#4b5563',
  display: 'inline-flex', alignItems: 'center',
};

// 右侧预览面板：HTML 直接在 iframe 里运行（可玩游戏）；音频直接内嵌播放器；也可看源码 / 复制 / 下载
// 支持左边缘拖拽调宽、Esc 关闭
export default function ArtifactPanel({ artifact, onClose }: Props) {
  const isAudio = artifact.type === 'audio';
  const canPreview = artifact.type === 'html' || isAudio;
  const [tab, setTab] = useState<'preview' | 'code'>(canPreview ? 'preview' : 'code');
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [width, setWidth] = useState<number>(() => {
    const saved = Number(localStorage.getItem('luoduo_artifact_panel_w'));
    return saved >= 360 && saved <= 1000 ? saved : 520;
  });
  const dragging = useRef(false);

  // 切换到不同产物时重置标签页并重跑
  useEffect(() => {
    setTab(canPreview ? 'preview' : 'code');
    setReloadKey(k => k + 1);
    setCopied(false);
  }, [artifact.code, canPreview]);

  // Esc 关闭面板
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 拖拽调宽（拖动时罩住 iframe，防止鼠标事件被吞）
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const w = Math.min(1000, Math.max(360, startW + (startX - ev.clientX)));
      setWidth(w);
    };
    const onUp = () => {
      dragging.current = false;
      setWidth(w => { localStorage.setItem('luoduo_artifact_panel_w', String(w)); return w; });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  const doCopy = async () => {
    const ok = await copyArtifactCode(artifact);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
  };

  return (
    <div style={{
      width, minWidth: 360, maxWidth: 1000, position: 'relative',
      borderLeft: '1px solid #ebebeb', background: '#fff',
      display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0,
    }}>
      {/* 左边缘拖拽条 */}
      <div onMouseDown={onDragStart}
        style={{ position: 'absolute', left: -3, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 10 }} />

      {/* 头部 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderBottom: '1px solid #ebebeb', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={artifact.title}>
          {artifact.title}
        </span>

        {/* 预览 / 源码 切换（音频无源码，不显示） */}
        {!isAudio && (
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
        )}

        <div style={{ flex: 1 }} />

        {artifact.type === 'html' && tab === 'preview' && (
          <button onClick={() => setReloadKey(k => k + 1)} title="重新运行" style={btnStyle}>
            <RefreshCw size={14} />
          </button>
        )}
        <button onClick={doCopy} title={copied ? '已复制' : (isAudio ? '复制链接' : '复制代码')} style={{ ...btnStyle, color: copied ? '#1a1a1a' : '#4b5563' }}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button onClick={() => downloadArtifact(artifact)} title="下载" style={btnStyle}>
          <Download size={14} />
        </button>
        <button onClick={onClose} title="关闭预览（Esc）" style={btnStyle}>
          <X size={14} />
        </button>
      </div>

      {/* 主体 */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#fff', position: 'relative' }}>
        {isAudio ? (
          <div style={{ height: '100%', padding: 24, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>🎵 {artifact.title}</div>
            <audio controls autoPlay src={artifact.url} style={{ width: '100%' }} />
            <div style={{ fontSize: 12, color: '#9ca3af', borderTop: '1px solid #ebebeb', paddingTop: 12 }}>
              开放 / 合规音源 · 可直接播放
            </div>
          </div>
        ) : tab === 'preview' && canPreview ? (
          <iframe
            key={reloadKey}
            title={artifact.title}
            srcDoc={buildPreviewDoc(artifact)}
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-forms allow-popups"
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
          />
        ) : (
          <pre style={{
            margin: 0, height: '100%', overflow: 'auto', padding: 16, boxSizing: 'border-box',
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
