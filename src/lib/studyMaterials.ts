import { getAuthHeaders } from './session';

/** Metadata returned by the API (the base64 payload is only sent on download). */
export interface StudyMaterial {
  id: string;
  title: string;
  description?: string;
  courseId?: string | null;
  tags?: string[];
  fileName: string;
  fileType: string;
  mimeType?: string;
  fileSize: number;
  uploaderId: string;
  uploaderName: string;
  uploaderRole?: string;
  downloads: number;
  createdAt: string;
  fileData?: string;
}

export const MAX_MATERIAL_BYTES = 25 * 1024 * 1024; // 25MB

export const ACCEPTED_MATERIAL_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
  'zip', 'rar', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
];

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function fileExtension(name: string): string {
  return (name.split('.').pop() || '').toLowerCase();
}

/** Groups used for the icon picker on the repository cards. */
export function fileKind(ext: string): 'pdf' | 'doc' | 'sheet' | 'slides' | 'archive' | 'image' | 'text' | 'file' {
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
  if (['ppt', 'pptx'].includes(ext)) return 'slides';
  if (['zip', 'rar'].includes(ext)) return 'archive';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['txt'].includes(ext)) return 'text';
  return 'file';
}

export function validateMaterialFile(file: File): string | null {
  const ext = fileExtension(file.name);
  if (!ACCEPTED_MATERIAL_EXTENSIONS.includes(ext)) {
    return `Unsupported file type ".${ext}". Allowed: ${ACCEPTED_MATERIAL_EXTENSIONS.join(', ')}`;
  }
  if (file.size > MAX_MATERIAL_BYTES) {
    return `File is too large (${formatBytes(file.size)}) — the maximum size is 25MB`;
  }
  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

export async function fetchMaterials(): Promise<StudyMaterial[]> {
  const resp = await fetch('/api/study-materials');
  if (!resp.ok) throw new Error('Could not load repository materials');
  const data = await resp.json();
  return (data.materials || []) as StudyMaterial[];
}

export async function fetchMyMaterials(): Promise<StudyMaterial[]> {
  const resp = await fetch('/api/study-materials/all', { headers: getAuthHeaders() });
  if (!resp.ok) throw new Error('Could not load your uploaded materials');
  const data = await resp.json();
  return (data.materials || []) as StudyMaterial[];
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = (header || '').slice(5).split(';')[0] || 'application/octet-stream';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Asks the server for the file (sign-in required), saves it through a
 * temporary object URL and returns the updated download count.
 */
export async function downloadMaterial(id: string): Promise<{ fileName: string; downloads: number }> {
  const resp = await fetch(`/api/study-materials/${id}/download`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (resp.status === 401) throw new Error('AUTH_REQUIRED');
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Download failed');
  }
  const data = await resp.json();
  if (!data.fileData) throw new Error('File is no longer available');

  const blob = dataUrlToBlob(data.fileData);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = data.fileName || 'study-material';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  return { fileName: data.fileName, downloads: data.downloads };
}
