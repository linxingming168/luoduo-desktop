// 附件读取工具：把用户选的文件读成可发送的内容（文本类拼进消息，图片走 images 字段）
// 🔒 2026-07-26 修复「文件/文件夹按钮选了没反应」：链路 = ChatInput 选文件 → 这里解析 → Chat.tsx 附件条 → 发送
// 🔒 2026-07-29 扩展：新增 Excel(.xlsx/.xls)/Word(.docx)/PDF/PPT(.pptx) 解析（xlsx+mammoth+jszip+pdfjs-dist），表格/文档可上传并让 Agent 读懂
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

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
const OFFICE_EXT = new Set(['xlsx', 'xls', 'docx', 'pdf', 'pptx']); // Excel/Word/PDF/PPT，前端用库解析为文本

const MAX_TEXT_FILE = 2 * 1024 * 1024;    // 单个文本文件 2MB
const MAX_IMAGE_FILE = 5 * 1024 * 1024;  // 单张图片 5MB
const MAX_OFFICE_FILE = 2 * 1024 * 1024;  // 单个办公文档 2MB
const MAX_TOTAL_TEXT = 5 * 1024 * 1024;  // 一次会话附带文本总量 5MB
const MAX_FILES = 20;                     // 文件夹最多取 20 个文件

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
        if (f.size > MAX_TEXT_FILE) { skipped.push(`${f.name}（超2MB）`); continue; }
        if (totalText + f.size > MAX_TOTAL_TEXT) { skipped.push(`${f.name}（文本总量已达上限）`); continue; }
        totalText += f.size;
        attachments.push({ name: f.name, size: f.size, kind: 'text', content: await readAsText(f) });
      } else if (OFFICE_EXT.has(ext)) {
        if (f.size > MAX_OFFICE_FILE) { skipped.push(`${f.name}（超2MB）`); continue; }
        try {
          const text = await readOffice(f);
          if (!text.trim()) { skipped.push(`${f.name}（解析为空，可另存为 .xlsx/.docx 再试）`); continue; }
          if (totalText + text.length > MAX_TOTAL_TEXT) { skipped.push(`${f.name}（文本总量已达上限）`); continue; }
          totalText += text.length;
          attachments.push({ name: f.name, size: f.size, kind: 'text', content: text });
        } catch {
          skipped.push(`${f.name}（解析失败，建议转成 .xlsx/.docx）`);
        }
      } else {
        skipped.push(`${f.name}（暂不支持 .${ext || '无后缀'}，支持 文本/代码/图片/Excel/Word/PDF/PPT 类）`);
      }
    } catch {
      skipped.push(`${f.name}（读取失败）`);
    }
  }
  return { attachments, skipped };
}

/** 把 Excel/Word/PDF/PPT 二进制读成纯文本（前端解析，避免改动后端；解析后作为文本附件拼进消息） */
async function readOffice(f: File): Promise<string> {
  const ext = extOf(f.name);
  const buf = await f.arrayBuffer();
  if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.read(buf, { type: 'array' });
    return wb.SheetNames.map(name => {
      const ws = wb.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(ws) || '';
      return `【Sheet: ${name}】\n${csv}`;
    }).join('\n\n');
  }
  if (ext === 'docx') {
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return res.value || '';
  }
  if (ext === 'pdf') {
    return readPdf(buf);
  }
  if (ext === 'pptx') {
    return readPptx(buf);
  }
  return '';
}

/** 解析 PDF：逐页提取文本 */
async function readPdf(buf: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let out = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const txt = (tc.items as Array<{ str?: string }>).map(it => it.str ?? '').join(' ');
    out += `【第 ${i} 页】\n${txt}\n\n`;
  }
  return out;
}

/** 解析 PPTX：解压取每页 slide xml 中的 <a:t> 文本（老 .ppt 二进制不支持，请转 .pptx） */
async function readPptx(buf: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = parseInt((a.match(/\d+/) || ['0'])[0], 10);
      const nb = parseInt((b.match(/\d+/) || ['0'])[0], 10);
      return na - nb;
    });
  let out = '';
  for (const name of names) {
    const xml = await zip.files[name].async('string');
    const texts = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)].map(m => m[1]);
    out += `【${name}】\n${texts.join('\n')}\n\n`;
  }
  return out;
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
