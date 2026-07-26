// 附件读取工具：把用户选的文件读成可发送的内容（文本类拼进消息，图片走 images 字段）
// 🔒 2026-07-26 修复「文件/文件夹按钮选了没反应」：链路 = ChatInput 选文件 → 这里解析 → Chat.tsx 附件条 → 发送

export interface Attachment {
  name: string;
  size: number;
  kind: 'text' | 'image';
  /** text: 文件文本内容；image: dataURL(base64) */
  content: string;
}

export interface ReadResult {
  attachments: Attachment[];
  skipped: string[]; // 被跳过的文件及原因
}

const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'log', 'xml', 'yml', 'yaml', 'ini', 'conf',
  'html', 'htm', 'css', 'js', 'ts', 'tsx', 'jsx', 'py', 'sh', 'bat', 'sql', 'java', 'c', 'cpp', 'h', 'go', 'rs', 'php', 'rb', 'vue',
]);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']);

const MAX_TEXT_FILE = 300 * 1024;   // 单个文本文件 300KB
const MAX_IMAGE_FILE = 5 * 1024 * 1024; // 单张图片 5MB
const MAX_TOTAL_TEXT = 500 * 1024;  // 一次会话附带文本总量 500KB
const MAX_FILES = 20;               // 文件夹最多取 20 个文件

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function readAsText(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error);
    r.readAsText(f);
  });
}

function readAsDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

/** 把 FileList 解析为附件（自动区分文本/图片，跳过不支持的格式并说明原因） */
export async function readFiles(list: FileList | File[] | null): Promise<ReadResult> {
  const attachments: Attachment[] = [];
  const skipped: string[] = [];
  if (!list) return { attachments, skipped };

  const files = Array.from(list).slice(0, MAX_FILES);
  if (Array.from(list).length > MAX_FILES) {
    skipped.push(`超出 ${MAX_FILES} 个的文件已忽略`);
  }

  let totalText = 0;
  for (const f of files) {
    const ext = extOf(f.name);
    try {
      if (IMAGE_EXT.has(ext)) {
        if (f.size > MAX_IMAGE_FILE) { skipped.push(`${f.name}（图片超5MB）`); continue; }
        attachments.push({ name: f.name, size: f.size, kind: 'image', content: await readAsDataUrl(f) });
      } else if (TEXT_EXT.has(ext)) {
        if (f.size > MAX_TEXT_FILE) { skipped.push(`${f.name}（超300KB）`); continue; }
        if (totalText + f.size > MAX_TOTAL_TEXT) { skipped.push(`${f.name}（文本总量已达上限）`); continue; }
        totalText += f.size;
        attachments.push({ name: f.name, size: f.size, kind: 'text', content: await readAsText(f) });
      } else {
        skipped.push(`${f.name}（暂不支持 .${ext || '无后缀'}，支持文本/代码/图片类）`);
      }
    } catch {
      skipped.push(`${f.name}（读取失败）`);
    }
  }
  return { attachments, skipped };
}

/** 把文本附件拼成发给模型的上下文块 */
export function buildAttachmentText(atts: Attachment[]): string {
  const texts = atts.filter(a => a.kind === 'text');
  if (!texts.length) return '';
  return texts
    .map(a => `\n\n【附件：${a.name}】\n\`\`\`\n${a.content}\n\`\`\``)
    .join('');
}

export function formatSize(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}
