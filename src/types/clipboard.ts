export interface ClipboardEntry {
  id: string;
  content_hash: string;
  content_type: string;
  content_data: string | null;
  source_app: string | null;
  created_at: number;
  copy_count: number;
  file_path: string | null;
  is_favorite: boolean;
}

export type ContentType = 'text' | 'image' | 'file' | 'unknown';

export interface Statistics {
  total_entries: number;
  total_copies: number;
  most_copied: ClipboardEntry[];
  recent_apps: AppUsage[];
}

export interface AppUsage {
  app_name: string;
  count: number;
}