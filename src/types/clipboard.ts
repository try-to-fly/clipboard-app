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
  content_subtype?: string | null;
  metadata?: string | null;
  app_bundle_id?: string | null;
}

export type ContentType = 'text' | 'image' | 'file' | 'unknown';

export type ContentSubType = 
  | 'plain_text'
  | 'url'
  | 'ip_address'
  | 'email'
  | 'color'
  | 'code'
  | 'command'
  | 'timestamp'
  | 'json'
  | 'markdown';

export interface ContentMetadata {
  detected_language?: string;
  url_parts?: UrlParts;
  color_formats?: ColorFormats;
  timestamp_formats?: TimestampFormats;
}

export interface UrlParts {
  protocol: string;
  host: string;
  path: string;
  query_params: Array<[string, string]>;
}

export interface ColorFormats {
  hex?: string;
  rgb?: string;
  rgba?: string;
  hsl?: string;
}

export interface TimestampFormats {
  unix_ms?: number;
  iso8601?: string;
  date_string?: string;
}

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