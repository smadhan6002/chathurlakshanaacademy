import { supabase } from './supabase';
import type {
  GalleryImageRow,
  GalleryImageInsert,
  GalleryReelRow,
  GalleryReelInsert,
  EnquiryRow,
  EnquiryInsert,
  EnquiryStatus,
} from '../types/database';

// ─────────────────────────────────────────────────────────────
// Compatibility Types
// ─────────────────────────────────────────────────────────────

export type MediaType = 'image' | 'reel';

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  media_type: MediaType;
  media_url: string;
  category: string;
  display_order: number;
  is_active: boolean; // maps to is_published
  storage_path?: string | null;
  thumbnail_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface MediaInsert {
  title: string;
  description?: string;
  media_type: MediaType;
  media_url: string;
  category?: string;
  display_order?: number;
  is_active?: boolean;
  storage_path?: string | null;
  thumbnail_url?: string | null;
}

// ─────────────────────────────────────────────────────────────
// URL Detection & Validation
// ─────────────────────────────────────────────────────────────

export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidImageUrl(url: string): boolean {
  return isValidUrl(url);
}

export type ReelUrlType = 'youtube' | 'youtube_short' | 'instagram' | 'direct_video' | 'unsupported';

export function detectReelUrlType(url: string): ReelUrlType {
  if (!isValidUrl(url)) return 'unsupported';
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.replace('www.', '').toLowerCase();

    if (hostname === 'youtube.com' && parsed.pathname === '/watch') return 'youtube';
    if (hostname === 'youtube.com' && parsed.pathname.startsWith('/embed/')) return 'youtube';
    if (hostname === 'youtu.be') return 'youtube_short';
    if (hostname === 'youtube.com' && parsed.pathname.startsWith('/shorts/')) return 'youtube_short';
    if (hostname === 'instagram.com' && (parsed.pathname.startsWith('/reel/') || parsed.pathname.startsWith('/p/'))) return 'instagram';

    const path = parsed.pathname.toLowerCase();
    if (path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.ogg')) return 'direct_video';

    return 'unsupported';
  } catch {
    return 'unsupported';
  }
}

export function isValidInstagramUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.replace('www.', '').toLowerCase();
    return (hostname === 'instagram.com' || hostname === 'instagr.am') &&
      (parsed.pathname.startsWith('/reel/') || parsed.pathname.startsWith('/p/'));
  } catch {
    return false;
  }
}

export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.replace('www.', '').toLowerCase();

    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      videoId = parsed.pathname.replace('/', '');
    } else if (hostname === 'youtube.com') {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.replace('/shorts/', '');
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.replace('/embed/', '');
      }
    }

    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  } catch {
    return null;
  }
}

export function getInstagramEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const match = parsed.pathname.match(/\/(reel|p)\/([^/]+)/);
    if (!match) return null;
    return `https://www.instagram.com/reel/${match[2]}/embed/`;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Storage Operations
// ─────────────────────────────────────────────────────────────

export const PRIMARY_STORAGE_BUCKET = 'gallery-images';
export const FALLBACK_STORAGE_BUCKET = 'gallery';

/**
 * Upload an image file to Supabase Storage.
 * Uses 'gallery-images' (the user's configured bucket) and falls back to 'gallery'.
 * Automatically generates a timestamped unique filename.
 */
export async function uploadGalleryImage(file: File): Promise<{
  publicUrl?: string;
  storagePath?: string;
  error?: string;
}> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { error: 'Selected file is not an image.' };
    }

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return { error: 'Image size exceeds the 10MB limit.' };
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}_${sanitizedName}`;
    const filePath = `uploads/${fileName}`;

    const candidateBuckets = [PRIMARY_STORAGE_BUCKET, FALLBACK_STORAGE_BUCKET];
    let lastError: any = null;

    for (const bucket of candidateBuckets) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        return {
          publicUrl: publicUrlData.publicUrl,
          storagePath: `${bucket}/${data.path}`,
        };
      }

      lastError = error;

      // If the bucket doesn't exist, try the next candidate bucket
      const isBucketNotFound =
        error?.message?.toLowerCase().includes('bucket not found') ||
        (error as any)?.code === 'NoSuchBucket' ||
        (error as any)?.statusCode === '404' ||
        (error as any)?.status === 404;

      if (!isBucketNotFound) {
        // Bucket exists but another error occurred (e.g. RLS policy missing)
        break;
      }
    }

    if (lastError) {
      const errMsg = lastError.message || String(lastError);
      if (
        errMsg.toLowerCase().includes('row-level security') ||
        errMsg.toLowerCase().includes('violates') ||
        lastError.statusCode === '403' ||
        lastError.code === 'AccessDenied'
      ) {
        return {
          error: `Storage upload failed: Permission denied by Supabase Storage Policy. Please run the SQL Storage Policy for '${PRIMARY_STORAGE_BUCKET}' in Supabase SQL Editor.`,
        };
      }

      return {
        error: `Storage upload failed: ${errMsg}. Ensure '${PRIMARY_STORAGE_BUCKET}' bucket exists in Supabase Storage with public access.`,
      };
    }

    return { error: 'Unexpected storage upload failure.' };
  } catch (err: any) {
    return { error: err?.message || 'Unexpected storage upload failure.' };
  }
}

/**
 * Delete an object from Supabase Storage bucket.
 */
export async function deleteGalleryStorageImage(storagePath: string): Promise<{ error: string | null }> {
  if (!storagePath) return { error: null };
  try {
    let bucket = PRIMARY_STORAGE_BUCKET;
    let path = storagePath;

    if (storagePath.startsWith(`${PRIMARY_STORAGE_BUCKET}/`)) {
      bucket = PRIMARY_STORAGE_BUCKET;
      path = storagePath.slice(PRIMARY_STORAGE_BUCKET.length + 1);
    } else if (storagePath.startsWith(`${FALLBACK_STORAGE_BUCKET}/`)) {
      bucket = FALLBACK_STORAGE_BUCKET;
      path = storagePath.slice(FALLBACK_STORAGE_BUCKET.length + 1);
    }

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      // Also attempt removal from fallback bucket if primary failed
      await supabase.storage.from(FALLBACK_STORAGE_BUCKET).remove([path]);
      console.warn('[Storage] Notice during delete from bucket:', error.message);
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Storage deletion error' };
  }
}

// ─────────────────────────────────────────────────────────────
// Gallery Images (Supabase Table: public.gallery_images)
// ─────────────────────────────────────────────────────────────

export async function fetchPublishedGalleryImages(): Promise<GalleryImageRow[]> {
  try {
    const { data, error } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as GalleryImageRow[];
  } catch (err) {
    console.warn('[Supabase] fetchPublishedGalleryImages error:', err);
    return [];
  }
}

export async function fetchAllGalleryImagesAdmin(): Promise<GalleryImageRow[]> {
  try {
    const { data, error } = await supabase
      .from('gallery_images')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as GalleryImageRow[];
  } catch (err: any) {
    console.warn('[Supabase] fetchAllGalleryImagesAdmin error:', err);
    throw err;
  }
}

export async function insertGalleryImage(item: GalleryImageInsert): Promise<{ data: GalleryImageRow | null; error: string | null }> {
  try {
    const payload: any = {
      title: item.title.trim(),
      description: item.description?.trim() || null,
      image_url: item.image_url.trim(),
      storage_path: item.storage_path || null,
      display_order: item.display_order ?? 0,
      is_published: item.is_published ?? true,
    };
    if (item.category) {
      payload.category = item.category;
    }

    const { data, error } = await supabase
      .from('gallery_images')
      .insert([payload])
      .select()
      .single();

    if (error) {
      // If table doesn't have 'category' column, retry insert without category
      const isMissingCategory =
        error.message?.includes('category') ||
        (error as any)?.code === 'PGRST204' ||
        (error as any)?.details?.includes('category');

      if (payload.category && isMissingCategory) {
        delete payload.category;
        const retryRes = await supabase
          .from('gallery_images')
          .insert([payload])
          .select()
          .single();

        if (retryRes.error) return { data: null, error: retryRes.error.message };
        return { data: retryRes.data as GalleryImageRow, error: null };
      }

      return { data: null, error: error.message };
    }

    return { data: data as GalleryImageRow, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to insert gallery image.' };
  }
}

export async function updateGalleryImage(
  id: string,
  updates: Partial<GalleryImageInsert>
): Promise<{ data: GalleryImageRow | null; error: string | null }> {
  try {
    const payload: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('gallery_images')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // If table doesn't have 'category' column, retry update without category
      const isMissingCategory =
        error.message?.includes('category') ||
        (error as any)?.code === 'PGRST204' ||
        (error as any)?.details?.includes('category');

      if (payload.category && isMissingCategory) {
        delete payload.category;
        const retryRes = await supabase
          .from('gallery_images')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (retryRes.error) return { data: null, error: retryRes.error.message };
        return { data: retryRes.data as GalleryImageRow, error: null };
      }

      return { data: null, error: error.message };
    }

    return { data: data as GalleryImageRow, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update gallery image.' };
  }
}

export async function deleteGalleryImage(
  id: string,
  storagePath?: string | null
): Promise<{ error: string | null }> {
  try {
    // Delete database record first
    const { error: dbError } = await supabase
      .from('gallery_images')
      .delete()
      .eq('id', id);

    if (dbError) return { error: dbError.message };

    // Remove from storage if applicable
    if (storagePath) {
      await deleteGalleryStorageImage(storagePath);
    }

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to delete gallery image.' };
  }
}

// ─────────────────────────────────────────────────────────────
// Gallery Reels (Supabase Table: public.gallery_reels)
// ─────────────────────────────────────────────────────────────

export async function fetchPublishedReels(): Promise<GalleryReelRow[]> {
  try {
    const { data, error } = await supabase
      .from('gallery_reels')
      .select('*')
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as GalleryReelRow[];
  } catch (err) {
    console.warn('[Supabase] fetchPublishedReels error:', err);
    return [];
  }
}

export async function fetchAllReelsAdmin(): Promise<GalleryReelRow[]> {
  try {
    const { data, error } = await supabase
      .from('gallery_reels')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as GalleryReelRow[];
  } catch (err: any) {
    console.warn('[Supabase] fetchAllReelsAdmin error:', err);
    throw err;
  }
}

export async function insertGalleryReel(item: GalleryReelInsert): Promise<{ data: GalleryReelRow | null; error: string | null }> {
  try {
    const payload = {
      title: item.title.trim(),
      description: item.description?.trim() || null,
      instagram_url: item.instagram_url.trim(),
      thumbnail_url: item.thumbnail_url?.trim() || null,
      display_order: item.display_order ?? 0,
      is_published: item.is_published ?? true,
    };

    const { data, error } = await supabase
      .from('gallery_reels')
      .insert([payload])
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as GalleryReelRow, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to insert reel.' };
  }
}

export async function updateGalleryReel(
  id: string,
  updates: Partial<GalleryReelInsert>
): Promise<{ data: GalleryReelRow | null; error: string | null }> {
  try {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('gallery_reels')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as GalleryReelRow, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update reel.' };
  }
}

export async function deleteGalleryReel(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('gallery_reels')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to delete reel.' };
  }
}

// ─────────────────────────────────────────────────────────────
// Enquiries (Supabase Table: public.enquiries)
// ─────────────────────────────────────────────────────────────

export async function submitEnquiry(enquiry: EnquiryInsert): Promise<{ data: EnquiryRow | null; error: string | null }> {
  try {
    const payload = {
      full_name: enquiry.full_name.trim(),
      email: enquiry.email.trim(),
      phone: enquiry.phone.trim(),
      course: enquiry.course.trim(),
      preferred_contact: enquiry.preferred_contact?.trim() || 'WhatsApp',
      message: enquiry.message.trim(),
      status: 'new' as EnquiryStatus,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('enquiries')
      .insert([payload])
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as EnquiryRow, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to submit enquiry to database.' };
  }
}

export async function fetchAllEnquiriesAdmin(): Promise<EnquiryRow[]> {
  try {
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EnquiryRow[];
  } catch (err: any) {
    console.warn('[Supabase] fetchAllEnquiriesAdmin error:', err);
    throw err;
  }
}

export async function updateEnquiryAdmin(
  id: string,
  updates: { status?: EnquiryStatus; admin_notes?: string | null }
): Promise<{ data: EnquiryRow | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('enquiries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as EnquiryRow, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update enquiry.' };
  }
}

export async function deleteEnquiryAdmin(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('enquiries')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to delete enquiry.' };
  }
}

// ─────────────────────────────────────────────────────────────
// Backward Compatibility Layer for MediaItem
// ─────────────────────────────────────────────────────────────

export async function fetchActiveMedia(type: MediaType): Promise<MediaItem[]> {
  if (type === 'image') {
    const images = await fetchPublishedGalleryImages();
    return images.map(img => ({
      id: img.id,
      title: img.title,
      description: img.description || '',
      media_type: 'image' as const,
      media_url: img.image_url,
      category: img.category || 'PERFORMANCES',
      display_order: img.display_order,
      is_active: img.is_published,
      storage_path: img.storage_path,
      created_at: img.created_at,
      updated_at: img.updated_at || img.created_at,
    }));
  } else {
    const reels = await fetchPublishedReels();
    return reels.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      media_type: 'reel' as const,
      media_url: r.instagram_url,
      category: 'REEL',
      display_order: r.display_order,
      is_active: r.is_published,
      thumbnail_url: r.thumbnail_url,
      created_at: r.created_at,
      updated_at: r.updated_at || r.created_at,
    }));
  }
}

export async function fetchAllMedia(): Promise<MediaItem[]> {
  const [images, reels] = await Promise.all([
    fetchAllGalleryImagesAdmin().catch(() => []),
    fetchAllReelsAdmin().catch(() => []),
  ]);

  const mappedImages: MediaItem[] = images.map(img => ({
    id: img.id,
    title: img.title,
    description: img.description || '',
    media_type: 'image' as const,
    media_url: img.image_url,
    category: img.category || 'PERFORMANCES',
    display_order: img.display_order,
    is_active: img.is_published,
    storage_path: img.storage_path,
    created_at: img.created_at,
    updated_at: img.updated_at || img.created_at,
  }));

  const mappedReels: MediaItem[] = reels.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description || '',
    media_type: 'reel' as const,
    media_url: r.instagram_url,
    category: 'REEL',
    display_order: r.display_order,
    is_active: r.is_published,
    thumbnail_url: r.thumbnail_url,
    created_at: r.created_at,
    updated_at: r.updated_at || r.created_at,
  }));

  return [...mappedImages, ...mappedReels];
}

export async function insertMedia(item: MediaInsert): Promise<{ data: MediaItem | null; error: string | null }> {
  if (item.media_type === 'image') {
    const res = await insertGalleryImage({
      title: item.title,
      description: item.description,
      image_url: item.media_url,
      storage_path: item.storage_path,
      display_order: item.display_order,
      is_published: item.is_active ?? true,
      category: item.category,
    });
    if (res.error || !res.data) return { data: null, error: res.error };
    return {
      data: {
        id: res.data.id,
        title: res.data.title,
        description: res.data.description || '',
        media_type: 'image',
        media_url: res.data.image_url,
        category: res.data.category || 'PERFORMANCES',
        display_order: res.data.display_order,
        is_active: res.data.is_published,
        storage_path: res.data.storage_path,
        created_at: res.data.created_at,
      },
      error: null,
    };
  } else {
    const res = await insertGalleryReel({
      title: item.title,
      description: item.description,
      instagram_url: item.media_url,
      thumbnail_url: item.thumbnail_url,
      display_order: item.display_order,
      is_published: item.is_active ?? true,
    });
    if (res.error || !res.data) return { data: null, error: res.error };
    return {
      data: {
        id: res.data.id,
        title: res.data.title,
        description: res.data.description || '',
        media_type: 'reel',
        media_url: res.data.instagram_url,
        category: 'REEL',
        display_order: res.data.display_order,
        is_active: res.data.is_published,
        thumbnail_url: res.data.thumbnail_url,
        created_at: res.data.created_at,
      },
      error: null,
    };
  }
}

export async function updateMedia(
  id: string,
  updates: Partial<MediaInsert>
): Promise<{ data: MediaItem | null; error: string | null }> {
  if (updates.media_type === 'reel') {
    const res = await updateGalleryReel(id, {
      title: updates.title,
      description: updates.description,
      instagram_url: updates.media_url,
      thumbnail_url: updates.thumbnail_url,
      display_order: updates.display_order,
      is_published: updates.is_active,
    });
    if (res.error || !res.data) return { data: null, error: res.error };
    return {
      data: {
        id: res.data.id,
        title: res.data.title,
        description: res.data.description || '',
        media_type: 'reel',
        media_url: res.data.instagram_url,
        category: 'REEL',
        display_order: res.data.display_order,
        is_active: res.data.is_published,
        created_at: res.data.created_at,
      },
      error: null,
    };
  } else {
    const res = await updateGalleryImage(id, {
      title: updates.title,
      description: updates.description,
      image_url: updates.media_url,
      storage_path: updates.storage_path,
      display_order: updates.display_order,
      is_published: updates.is_active,
      category: updates.category,
    });
    if (res.error || !res.data) return { data: null, error: res.error };
    return {
      data: {
        id: res.data.id,
        title: res.data.title,
        description: res.data.description || '',
        media_type: 'image',
        media_url: res.data.image_url,
        category: res.data.category || 'PERFORMANCES',
        display_order: res.data.display_order,
        is_active: res.data.is_published,
        storage_path: res.data.storage_path,
        created_at: res.data.created_at,
      },
      error: null,
    };
  }
}

export async function deleteMedia(id: string, storagePath?: string | null): Promise<{ error: string | null }> {
  // Try deleting from images first
  const imgRes = await deleteGalleryImage(id, storagePath);
  if (!imgRes.error) return { error: null };

  // If not found in images, try reels
  return deleteGalleryReel(id);
}
