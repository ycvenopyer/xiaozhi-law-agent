import multer from 'multer';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

/** In-memory upload (no disk persistence needed — file text is sent to the LLM). */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // Leave room for multipart metadata under Pages' 6 MB cap.
});

const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'csv', 'json', 'log', 'yaml', 'yml',
  'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'c', 'cpp',
  'h', 'hpp', 'sh', 'bash', 'html', 'css', 'xml', 'sql', 'toml',
]);

const MAX_CHARS = 40000;

export interface ParsedFile {
  name: string;
  size: number;
  type: string;
  ext: string;
  text: string;
  truncated: boolean;
  charCount: number;
}

/**
 * busboy (multer's underlying parser) decodes the multipart filename as
 * Latin-1 by default, which garbles UTF-8 names (e.g. Chinese). Re-encode
 * to recover the original filename when it looks mangled.
 */
function fixName(name: string): string {
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf-8');
    if (decoded !== name && !decoded.includes('�')) return decoded;
  } catch {
    /* keep original on failure */
  }
  return name;
}

/**
 * Extract readable text from an uploaded file. Text-like files are read as
 * UTF-8; PDFs go through pdf-parse; .docx goes through mammoth; everything
 * else is attempted as UTF-8 as a best effort.
 */
export async function parseFile(file: Express.Multer.File): Promise<ParsedFile> {
  const original = fixName(file.originalname || 'upload');
  const ext = original.includes('.') ? original.split('.').pop()!.toLowerCase() : '';
  const isPdf = file.mimetype === 'application/pdf' || ext === 'pdf';
  const isDocx =
    ext === 'docx' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  let text: string;
  if (isPdf) {
    try {
      const out = await pdf(file.buffer);
      text = out.text || '';
    } catch {
      text = '（无法从该 PDF 提取文本，可能是扫描件或文件已损坏）';
    }
  } else if (isDocx) {
    try {
      const out = await mammoth.extractRawText({ buffer: file.buffer });
      text = out.value || '';
    } catch {
      text = '（无法从该 Word 文档提取文本，可能是旧版 .doc 格式或文件已损坏）';
    }
  } else if (TEXT_EXT.has(ext) || file.mimetype.startsWith('text/')) {
    text = file.buffer.toString('utf-8');
  } else {
    // Best-effort: try to decode as UTF-8 text.
    text = file.buffer.toString('utf-8');
  }

  const truncated = text.length > MAX_CHARS;
  const finalText = truncated ? text.slice(0, MAX_CHARS) : text;

  return {
    name: original,
    size: file.size,
    type: file.mimetype || 'application/octet-stream',
    ext,
    text: finalText,
    truncated,
    charCount: finalText.length,
  };
}
