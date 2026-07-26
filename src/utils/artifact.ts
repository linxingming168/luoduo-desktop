// 从 AI 回复中抽取可预览的产物（HTML 网页/游戏、或代码块）
// 返回：剥离代码后的正文文本 + 产物对象（无则 null）

export interface Artifact {
  type: 'html' | 'code';
  lang: string;   // 'html' | 'js' | 'python' | 'css' | ...
  code: string;
  title: string;  // 例如「贪食蛇.html」「代码.js」
}

const HTML_HINT = /<!doctype html|<html[\s>]/i;

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

export function extractArtifact(reply: string): { text: string; artifact: Artifact | null } {
  if (!reply) return { text: reply, artifact: null };

  // 1) 优先解析 ```lang ... ``` 围栏代码块
  const fenceRe = /```([a-zA-Z0-9+#-]*)\r?\n([\s\S]*?)```/g;
  const blocks: { lang: string; code: string; raw: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(reply)) !== null) {
    blocks.push({ lang: (m[1] || '').toLowerCase(), code: m[2].trim(), raw: m[0] });
  }

  if (blocks.length) {
    // 挑选：优先带 html 语言标记或看起来像完整 HTML 的块；否则取第一个代码块
    let chosen = blocks.find(b => b.lang === 'html' || HTML_HINT.test(b.code)) || blocks[0];
    const isHtml = chosen.lang === 'html' || HTML_HINT.test(chosen.code);
    const placeholder = isHtml
      ? '📦 已生成可运行的网页/游戏 —— 点右侧「预览」即可直接玩，或点「下载」保存文件。'
      : '📦 已生成代码 —— 见下方卡片，可查看源码或下载。';
    const text = reply.replace(chosen.raw, placeholder).trim();
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
    const text = reply.replace(code, '📦 已生成可运行的网页/游戏 —— 点右侧「预览」即可直接玩，或点「下载」保存文件。').trim();
    return {
      text,
      artifact: { type: 'html', lang: 'html', code, title: guessTitle('html', code, true) },
    };
  }

  return { text: reply, artifact: null };
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
