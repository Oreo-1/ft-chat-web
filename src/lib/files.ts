import {
  mdiAndroid,
  mdiFileDocumentOutline,
  mdiFileExcelOutline,
  mdiFileMusicOutline,
  mdiFileOutline,
  mdiFilePdfBox,
  mdiFilePowerpointOutline,
  mdiFileWordOutline,
  mdiFolderZipOutline,
} from '@mdi/js';
import { pb } from './pb';
import type { Msg } from './chatlist';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', '3gp', 'm4v']);

export function fileExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

export const isImage = (name: string) => IMAGE_EXTS.has(fileExt(name));
export const isVideo = (name: string) => VIDEO_EXTS.has(fileExt(name));
export const isMedia = (name: string) => isImage(name) || isVideo(name);

/** PocketBase stores uploads as "name_<10 random chars>.ext"; strip that for display. */
export function displayFileName(name: string): string {
  return name.replace(/_[a-zA-Z0-9]{10}(?=\.[^.]+$|$)/, '');
}

export function fileUrl(m: Msg, name: string, opts: { thumb?: string; download?: boolean } = {}): string {
  const query: Record<string, string> = {};
  if (opts.thumb) query.thumb = opts.thumb;
  if (opts.download) query.download = '1';
  return pb.files.getURL(m, name, query);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export interface FileMeta {
  size: number | null;
  type: string | null;
}

const metaCache = new Map<string, Promise<FileMeta>>();

/**
 * Size/MIME of a stored file. PocketBase only keeps filenames on the record,
 * so read them once with a HEAD request (Content-Length and Content-Type are
 * CORS-safelisted, so this works cross-origin) and memoize.
 */
export function fetchFileMeta(url: string): Promise<FileMeta> {
  let p = metaCache.get(url);
  if (!p) {
    p = fetch(url, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) throw new Error(`HEAD ${res.status}`);
        const len = res.headers.get('content-length');
        return {
          size: len ? Number(len) : null,
          type: res.headers.get('content-type')?.split(';')[0].trim() ?? null,
        };
      })
      .catch(() => {
        metaCache.delete(url); // allow a retry later
        return { size: null, type: null };
      });
    metaCache.set(url, p);
  }
  return p;
}

/** Icon (MDI path) for a non-media file. */
export function fileIcon(name: string): string {
  switch (fileExt(name)) {
    case 'pdf':
      return mdiFilePdfBox;
    case 'zip': case 'rar': case '7z': case 'tar': case 'gz': case 'xz':
      return mdiFolderZipOutline;
    case 'mp3': case 'wav': case 'flac': case 'ogg': case 'm4a': case 'aac': case 'opus':
      return mdiFileMusicOutline;
    case 'apk':
      return mdiAndroid;
    case 'txt': case 'md': case 'csv': case 'json': case 'log': case 'xml': case 'yaml': case 'yml':
      return mdiFileDocumentOutline;
    case 'doc': case 'docx': case 'odt': case 'rtf':
      return mdiFileWordOutline;
    case 'xls': case 'xlsx': case 'ods':
      return mdiFileExcelOutline;
    case 'ppt': case 'pptx': case 'odp':
      return mdiFilePowerpointOutline;
    default:
      return mdiFileOutline;
  }
}
