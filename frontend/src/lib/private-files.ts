import { requireCloud } from './cloudbase';
import { currentOwner, saveCollection } from './cloud-store';
import type { AttachedFile } from '@/types/agent';

const attachmentContentTypes: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  csv: 'text/csv',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  md: 'text/markdown',
  markdown: 'text/markdown',
  txt: 'text/plain',
};

export async function storeOriginal(file: File, id: string = crypto.randomUUID()): Promise<AttachedFile> {
  if (file.size > 4 * 1024 * 1024) throw new Error('文件超过 4 MiB，请压缩或拆分后重试。');
  const uid = currentOwner();
  if (!uid) throw new Error('请先登录。');
  const safeName = file.name.replace(/[^\p{L}\p{N}._-]/gu, '_').slice(-120) || 'attachment';
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1].toLowerCase() || '';
  const type = attachmentContentTypes[extension] || file.type || 'text/plain';
  const path = `${uid}/${id}/${safeName}`;
  const bucket = requireCloud().storage.from('private-files');
  const { error } = await bucket.upload(path, file, { contentType: type, upsert: false });
  if (error) throw new Error('原始文件保存失败，请检查私有存储迁移和文件类型限制。');
  const saved: AttachedFile = { id, name: file.name, size: file.size, type, text: '', charCount: 0,
    truncated: false, kind: type.startsWith('image/') ? 'image' : 'doc',
    storageBucket: 'private-files', storagePath: path };
  try {
    await saveCollection('files', [saved], false);
  } catch (error) {
    await bucket.remove([path]);
    throw error;
  }
  return saved;
}

export async function imageDataUrl(file: AttachedFile): Promise<string> {
  if (file.dataUrl) return file.dataUrl;
  if (!file.storagePath) throw new Error('图片没有原件，请重新上传。');
  const { data, error } = await requireCloud().storage.from('private-files').download(file.storagePath);
  if (error || !data) throw new Error('无法读取图片原件。');
  return blobDataUrl(data);
}

export function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取文件失败。'));
    reader.readAsDataURL(blob);
  });
}

export async function downloadOriginal(file: AttachedFile) {
  if (!file.storagePath) throw new Error('旧记录中没有原始文件，请重新上传。');
  const { data, error } = await requireCloud().storage.from('private-files').download(file.storagePath);
  if (error || !data) throw new Error('文件下载失败。');
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url; link.download = file.name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
