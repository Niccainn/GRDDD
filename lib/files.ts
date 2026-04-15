export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export type FileCategory = 'image' | 'document' | 'spreadsheet' | 'archive' | 'other';

export function getFileCategory(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown'
  ) {
    return 'document';
  }
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/csv'
  ) {
    return 'spreadsheet';
  }
  if (mimeType === 'application/zip') return 'archive';
  return 'other';
}

export function getFileIcon(mimeType: string): string {
  const category = getFileCategory(mimeType);
  switch (category) {
    case 'image':
      return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="7" cy="8" r="1.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M2 13l4-3 3 2 4-4 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    case 'document':
      return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 2h7l5 5v10a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 2v5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
    case 'spreadsheet':
      return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M2 7h16M2 12h16M8 7v11M13 7v11" stroke="currentColor" stroke-width="1.5"/>
      </svg>`;
    case 'archive':
      return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M2 4h16v3H2z" stroke="currentColor" stroke-width="1.5"/>
        <rect x="8" y="10" width="4" height="3" rx="0.5" stroke="currentColor" stroke-width="1.5"/>
      </svg>`;
    default:
      return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 2h7l5 5v10a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 2v5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
  }
}
