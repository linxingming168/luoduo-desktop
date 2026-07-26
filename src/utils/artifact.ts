// 从 AI 回复中抽取可预览的产物（HTML 网页/游戏、或代码块）
// 返回：剥离代码后的正文文本 + 产物对象（无则 null）

export interface Artifact {
  type: 'html' | 'code';
  lang: string;   // 'html' | 'js' | 'python' | 'css' | ...
  code: string;
  title: string;  // 例如「贪食蛇.html」「代码.js」
}

const HTML_HINT = /<!doctype html|<html[\s>]/i;
// HTML 片段特征：没有完整文档结构，但含可运行的标签组合
const HTML_FRAGMENT_HINT = /<(canvas|div|body|style|script|svg|button|form|table)[\s>][\s\S]*<\/(canvas|div|body|style|script|svg|button|form|table)>/i;
// 小于该长度的普通代码块不抽成产物（保留在正文里直接看）
const MIN_CODE_ARTIFACT_LEN = 160;

function guessTitle(lang: string, code: string, isHtml: boolean): string {
  if (isHtml) {
    const t = code.match(/<title[^>]*>([^<]+)<\/title>/i);
    const name = t && t[1].trim() ? t[1].trim() : '网页';
    return `${name}.html`;
  }
  const extMap: Record<string, string> = {
    javascript: 'js', js: 'js', jsx: 'jsx',
    typescript: 'ts', ts: 'ts', tsx: 'tsx',
    python: 'py', py: 'py',
    css: 'css', json: 'json',
    bash: 'sh', sh: 'sh', shell: 'sh',
    java: 'java', go: 'go', rust: 'rs', c: 'c', cpp: 'cpp',
    html: 'html', xml: 'xml', yaml: 'yaml', sql: 'sql', md: 'md',
  };
  const ext = extMap[lang] || 'txt';
  return `代码.${ext}`;
}

function isHtmlLike(lang: string, code: string): boolean {
  return lang === 'html' || HTML_HINT.test(code) || HTML_FRAGMENT_HINT.test(code);
}

const HTML_PLACEHOLDER = '📦 已生成可运行的网页/游戏 —— 右侧预览面板可直接玩，也可点「下载」保存文件。';
const CODE_PLACEHOLDER = '📦 已生成代码 —— 见下方卡片，可查看源码或下载。';

export function extractArtifact(reply: string): { text: string; artifact: Artifact | null } {
  if (!reply) return { text: reply, artifact: null };

  // 1) 优先解析 ```lang ... ``` 围栏代码块
  const fenceRe = /```([a-zA-Z0-9+#-]*)\r?\n([\s\S]*?)```/g;
  const blocks: { lang: string; code: string; raw: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(reply)) !== null) {
    blocks.push({ lang: (m[1] || '').toLowerCase(), code: m[2].trim(), raw: m[0] });
  }

  // 1b) 兜底：未闭合的围栏（回复被截断时 ```html 后面没有结尾 ```）
  if (!blocks.length) {
    const openFence = reply.match(/```([a-zA-Z0-9+#-]*)\r?\n([\s\S]{80,})$/);
    if (openFence) {
      blocks.push({ lang: (openFence[1] || '').toLowerCase(), code: openFence[2].trim(), raw: openFence[0] });
    }
  }

  if (blocks.length) {
    // 挑选：优先 HTML 类块（可直接运行）；否则取最长的代码块
    const htmlBlock = blocks.find(b => isHtmlLike(b.lang, b.code));
    const longest = blocks.reduce((a, b) => (b.code.length > a.code.length ? b : a), blocks[0]);
    const chosen = htmlBlock || longest;
    const isHtml = isHtmlLike(chosen.lang, chosen.code);

    // 非 HTML 且太短的代码块：不抽产物，正文原样保留
    if (!isHtml && chosen.code.length < MIN_CODE_ARTIFACT_LEN) {
      return { text: reply, artifact: null };
    }

    const text = reply.replace(chosen.raw, isHtml ? HTML_PLACEHOLDER : CODE_PLACEHOLDER).trim();
    return {
      text,
      artifact: {
        type: isHtml ? 'html' : 'code',
        lang: chosen.lang || (isHtml ? 'html' : 'text'),
        code: chosen.code,
        title: guessTitle(chosen.lang, chosen.code, isHtml),
      },
    };
  }

  // 2) 无围栏时，识别裸 HTML 文档
  const bare = reply.match(/<!doctype html[\s\S]*?<\/html>/i) || reply.match(/<html[\s\S]*?<\/html>/i);
  if (bare) {
    const code = bare[0];
    const text = reply.replace(code, HTML_PLACEHOLDER).trim();
    return {
      text,
      artifact: { type: 'html', lang: 'html', code, title: guessTitle('html', code, true) },
    };
  }

  return { text: reply, artifact: null };
}

// 预览用：HTML 片段（无完整文档结构）自动包壳，避免 iframe 白屏
export function buildPreviewDoc(a: Artifact): string {
  if (a.type !== 'html') return a.code;
  if (HTML_HINT.test(a.code)) return a.code; // 已是完整文档
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<style>body{margin:0;background:#fff;color:#1a1a1a;font-family:system-ui,sans-serif;}</style>',
    '</head><body>',
    a.code,
    '</body></html>',
  ].join('\n');
}

// 浏览器/Electron 渲染进程通用的 Blob 下载
export function downloadArtifact(a: Artifact): void {
  const mime = a.type === 'html' ? 'text/html' : 'text/plain';
  const blob = new Blob([a.code], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = a.title;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 复制代码到剪贴板（带降级方案）
export async function copyArtifactCode(a: Artifact): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(a.code);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = a.code;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
