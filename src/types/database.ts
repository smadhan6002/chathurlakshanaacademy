export interface GalleryImageRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  storage_path: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  category?: string; // Optional category support for UI grouping
}

export interface GalleryImageInsert {
  id?: string;
  title: string;
  description?: string | null;
  image_url: string;
  storage_path?: string | null;
  display_order?: number;
  is_published?: boolean;
  category?: string;
}

export interface GalleryReelRow {
  id: string;
  title: string;
  description: string | null;
  instagram_url: string;
  thumbnail_url: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

export interface GalleryReelInsert {
  id?: string;
  title: string;
  description?: string | null;
  instagram_url: string;
  thumbnail_url?: string | null;
  display_order?: number;
  is_published?: boolean;
}

export type EnquiryStatus = 'new' | 'contacted' | 'completed' | 'cancelled';

export interface EnquiryRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  course: string;
  preferred_contact: string;
  message: string;
  status: EnquiryStatus;
  admin_notes: string | null;
  created_at: string;
}

export interface EnquiryInsert {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  course: string;
  preferred_contact?: string;
  message: string;
  status?: EnquiryStatus;
  admin_notes?: string | null;
}
