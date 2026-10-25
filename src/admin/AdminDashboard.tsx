import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GALLERY_CATEGORIES } from './config';
import {
  fetchAllGalleryImagesAdmin,
  insertGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  uploadGalleryImage,
  fetchAllReelsAdmin,
  insertGalleryReel,
  updateGalleryReel,
  deleteGalleryReel,
  fetchAllEnquiriesAdmin,
  updateEnquiryAdmin,
  deleteEnquiryAdmin,
  detectReelUrlType,
  getYouTubeEmbedUrl,
  getInstagramEmbedUrl,
  isValidUrl,
} from '../lib/mediaService';
import type {
  GalleryImageRow,
  GalleryReelRow,
  EnquiryRow,
  EnquiryStatus,
} from '../types/database';

// ─── Tab / View States ────────────────────────────────────────
type TabState =
  | 'gallery_manage'
  | 'gallery_add'
  | 'reels_manage'
  | 'reels_add'
  | 'enquiries_manage';

// ─── Shared style tokens ──────────────────────────────────────
const btnStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  padding: '12px 24px',
  border: 'none',
  transition: 'all 0.2s ease',
};

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border)',
  padding: '12px 16px',
  fontFamily: "var(--font-body)",
  fontSize: '15px',
  color: 'var(--color-text-primary)',
  outline: 'none',
  marginBottom: '20px',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: '12px',
  letterSpacing: '0.15em',
  fontWeight: 600,
  color: 'var(--color-accent)',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '8px',
};

// ─── Reel Preview Component ───────────────────────────────────
function ReelPreview({ url }: { url: string }) {
  const type = detectReelUrlType(url);

  if (type === 'youtube' || type === 'youtube_short') {
    const embedUrl = getYouTubeEmbedUrl(url);
    if (!embedUrl) return <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', padding: '12px 0' }}>Invalid YouTube URL</div>;
    return (
      <div style={{ position: 'relative', paddingTop: '56.25%', marginBottom: '16px', background: '#000' }}>
        <iframe
          src={embedUrl}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube preview"
        />
      </div>
    );
  }

  if (type === 'instagram') {
    const embedUrl = getInstagramEmbedUrl(url);
    if (!embedUrl) {
      return (
        <div style={{ padding: '16px', background: 'var(--color-bg-secondary)', marginBottom: '16px', border: '1px solid var(--color-border)', color: 'var(--color-accent)', fontSize: '13px' }}>
          ✦ Instagram Reel URL detected: {url}
        </div>
      );
    }
    return (
      <div style={{ marginBottom: '16px' }}>
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: '480px', border: 'none', maxWidth: '320px' }}
          scrolling="no"
          allowTransparency
          title="Instagram reel preview"
        />
      </div>
    );
  }

  if (type === 'direct_video') {
    return (
      <video
        src={url}
        controls
        style={{ width: '100%', maxHeight: '300px', marginBottom: '16px', background: '#000' }}
      />
    );
  }

  return null;
}

// ─── Image Preview Component ──────────────────────────────────
function ImagePreview({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [url]);

  if (!url) return null;

  return (
    <div style={{ marginBottom: '16px', border: '1px solid var(--color-border)', overflow: 'hidden', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)' }}>
      {!loaded && !error && (
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', padding: '20px' }}>Loading preview...</div>
      )}
      {error && (
        <div style={{ color: '#e57373', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
          ⚠ Could not load image preview. Check URL or storage file.
        </div>
      )}
      <img
        src={url}
        alt="Preview"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: loaded ? 'block' : 'none' }}
      />
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────
export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<TabState>('gallery_manage');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Data collections from Supabase
  const [images, setImages] = useState<GalleryImageRow[]>([]);
  const [reels, setReels] = useState<GalleryReelRow[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);

  // ── Gallery form state ──────────────────────────────────────
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [imgTitle, setImgTitle] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [imgStoragePath, setImgStoragePath] = useState<string | null>(null);
  const [imgCategory, setImgCategory] = useState(GALLERY_CATEGORIES[1] || 'PERFORMANCES');
  const [imgDescription, setImgDescription] = useState('');
  const [imgDisplayOrder, setImgDisplayOrder] = useState<number>(0);
  const [imgIsPublished, setImgIsPublished] = useState<boolean>(true);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Reel form state ─────────────────────────────────────────
  const [reelEditingId, setReelEditingId] = useState<string | null>(null);
  const [reelTitle, setReelTitle] = useState('');
  const [reelUrl, setReelUrl] = useState('');
  const [reelThumbnailUrl, setReelThumbnailUrl] = useState('');
  const [reelDescription, setReelDescription] = useState('');
  const [reelDisplayOrder, setReelDisplayOrder] = useState<number>(0);
  const [reelIsPublished, setReelIsPublished] = useState<boolean>(true);
  const [reelUrlError, setReelUrlError] = useState('');

  // ── Enquiry filter & edit state ─────────────────────────────
  const [enquirySearch, setEnquirySearch] = useState('');
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState<'ALL' | EnquiryStatus>('ALL');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // ─── Data loading ─────────────────────────────────────────
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [imagesData, reelsData, enquiriesData] = await Promise.all([
        fetchAllGalleryImagesAdmin().catch(e => {
          console.warn('Failed to load gallery images:', e);
          return [] as GalleryImageRow[];
        }),
        fetchAllReelsAdmin().catch(e => {
          console.warn('Failed to load reels:', e);
          return [] as GalleryReelRow[];
        }),
        fetchAllEnquiriesAdmin().catch(e => {
          console.warn('Failed to load enquiries:', e);
          return [] as EnquiryRow[];
        }),
      ]);

      setImages(imagesData);
      setReels(reelsData);
      setEnquiries(enquiriesData);
    } catch (err: any) {
      setFetchError(err?.message || 'Failed to connect to Supabase. Check credentials and database tables.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ─── Toast helper ─────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ─── Gallery Helpers ──────────────────────────────────────
  const resetImgForm = () => {
    setEditingImageId(null);
    setImgTitle('');
    setImgUrl('');
    setImgStoragePath(null);
    setImgCategory(GALLERY_CATEGORIES[1] || 'PERFORMANCES');
    setImgDescription('');
    setImgDisplayOrder(0);
    setImgIsPublished(true);
    setSelectedImageFile(null);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processSelectedFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP, GIF).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size exceeds 10MB limit. Please upload a smaller image.', 'error');
      return;
    }

    setSelectedImageFile(file);
    // Instant local preview while uploading
    const objectUrl = URL.createObjectURL(file);
    setImgUrl(objectUrl);

    setIsUploadingFile(true);
    const result = await uploadGalleryImage(file);
    setIsUploadingFile(false);

    if (result.error || !result.publicUrl) {
      showToast(result.error || 'Upload to Supabase Storage failed.', 'error');
    } else {
      setImgUrl(result.publicUrl);
      setImgStoragePath(result.storagePath || null);
      showToast('Image uploaded to Supabase Storage successfully.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleRemoveSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageFile(null);
    setImgUrl('');
    setImgStoragePath(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveImage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imgTitle.trim()) {
      showToast('Please enter an image title.', 'error');
      return;
    }

    if (!imgUrl.trim() && !selectedImageFile) {
      showToast('Please upload an image file or provide an image URL.', 'error');
      return;
    }

    // If an image file was picked but not yet successfully uploaded to storage
    if (imgUrl.startsWith('blob:') && selectedImageFile) {
      setIsUploadingFile(true);
      const res = await uploadGalleryImage(selectedImageFile);
      setIsUploadingFile(false);
      if (res.error || !res.publicUrl) {
        showToast(res.error || 'Failed to upload image to Supabase Storage.', 'error');
        return;
      }
      setImgUrl(res.publicUrl);
      setImgStoragePath(res.storagePath || null);
    }

    setIsSaving(true);
    try {
      if (editingImageId) {
        const { error } = await updateGalleryImage(editingImageId, {
          title: imgTitle,
          description: imgDescription,
          image_url: imgUrl,
          storage_path: imgStoragePath,
          category: imgCategory,
          display_order: Number(imgDisplayOrder) || 0,
          is_published: imgIsPublished,
        });

        if (error) {
          showToast(`Update failed: ${error}`, 'error');
          return;
        }
        showToast('Gallery image updated successfully.');
      } else {
        const { error } = await insertGalleryImage({
          title: imgTitle,
          description: imgDescription,
          image_url: imgUrl,
          storage_path: imgStoragePath,
          category: imgCategory,
          display_order: Number(imgDisplayOrder) || 0,
          is_published: imgIsPublished,
        });

        if (error) {
          showToast(`Save failed: ${error}`, 'error');
          return;
        }
        showToast('Image saved to Supabase gallery successfully.');
        resetImgForm();
      }

      await loadAllData();
      setView('gallery_manage');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditImage = (item: GalleryImageRow) => {
    setEditingImageId(item.id);
    setImgTitle(item.title);
    setImgUrl(item.image_url);
    setImgStoragePath(item.storage_path || null);
    setImgCategory(item.category || GALLERY_CATEGORIES[1]);
    setImgDescription(item.description || '');
    setImgDisplayOrder(item.display_order ?? 0);
    setImgIsPublished(item.is_published ?? true);
    setSelectedImageFile(null);
    setView('gallery_add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteImage = async (item: GalleryImageRow) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;

    const { error } = await deleteGalleryImage(item.id, item.storage_path);
    if (error) {
      showToast(`Failed to delete image: ${error}`, 'error');
      return;
    }
    showToast('Image deleted from database and storage.');
    await loadAllData();
  };

  const handleToggleImagePublished = async (item: GalleryImageRow) => {
    const nextState = !item.is_published;
    const { error } = await updateGalleryImage(item.id, { is_published: nextState });
    if (error) {
      showToast(`Failed to toggle state: ${error}`, 'error');
      return;
    }
    showToast(`Image is now ${nextState ? 'PUBLISHED' : 'UNPUBLISHED'}.`);
    await loadAllData();
  };

  // ─── Reel Helpers ─────────────────────────────────────────
  const resetReelForm = () => {
    setReelEditingId(null);
    setReelTitle('');
    setReelUrl('');
    setReelThumbnailUrl('');
    setReelDescription('');
    setReelDisplayOrder(0);
    setReelIsPublished(true);
    setReelUrlError('');
  };

  const validateReelUrl = (url: string): string => {
    if (!url.trim()) return 'Please enter a reel URL.';
    if (!isValidUrl(url)) return 'Please enter a valid URL (e.g. https://www.instagram.com/reel/...)';
    const type = detectReelUrlType(url);
    if (type === 'unsupported') {
      return 'Unsupported URL format. Please provide an Instagram Reel, YouTube link, or direct video URL.';
    }
    return '';
  };

  const handleSaveReel = async (e: React.FormEvent) => {
    e.preventDefault();
    const urlErr = validateReelUrl(reelUrl);
    setReelUrlError(urlErr);
    if (urlErr) return;

    if (!reelTitle.trim()) {
      showToast('Please enter a reel title.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (reelEditingId) {
        const { error } = await updateGalleryReel(reelEditingId, {
          title: reelTitle,
          description: reelDescription,
          instagram_url: reelUrl,
          thumbnail_url: reelThumbnailUrl || null,
          display_order: Number(reelDisplayOrder) || 0,
          is_published: reelIsPublished,
        });

        if (error) {
          showToast(`Failed to update reel: ${error}`, 'error');
          return;
        }
        showToast('Reel updated successfully.');
      } else {
        const { error } = await insertGalleryReel({
          title: reelTitle,
          description: reelDescription,
          instagram_url: reelUrl,
          thumbnail_url: reelThumbnailUrl || null,
          display_order: Number(reelDisplayOrder) || 0,
          is_published: reelIsPublished,
        });

        if (error) {
          showToast(`Failed to save reel: ${error}`, 'error');
          return;
        }
        showToast('Reel saved to database successfully.');
        resetReelForm();
      }

      await loadAllData();
      setView('reels_manage');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditReel = (item: GalleryReelRow) => {
    setReelEditingId(item.id);
    setReelTitle(item.title);
    setReelUrl(item.instagram_url);
    setReelThumbnailUrl(item.thumbnail_url || '');
    setReelDescription(item.description || '');
    setReelDisplayOrder(item.display_order ?? 0);
    setReelIsPublished(item.is_published ?? true);
    setReelUrlError('');
    setView('reels_add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReel = async (item: GalleryReelRow) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    const { error } = await deleteGalleryReel(item.id);
    if (error) {
      showToast(`Failed to delete reel: ${error}`, 'error');
      return;
    }
    showToast('Reel deleted from database.');
    await loadAllData();
  };

  const handleToggleReelPublished = async (item: GalleryReelRow) => {
    const nextState = !item.is_published;
    const { error } = await updateGalleryReel(item.id, { is_published: nextState });
    if (error) {
      showToast(`Failed to toggle state: ${error}`, 'error');
      return;
    }
    showToast(`Reel is now ${nextState ? 'PUBLISHED' : 'UNPUBLISHED'}.`);
    await loadAllData();
  };

  // ─── Enquiry Helpers ──────────────────────────────────────
  const handleUpdateEnquiryStatus = async (enquiryId: string, nextStatus: EnquiryStatus) => {
    const { error } = await updateEnquiryAdmin(enquiryId, { status: nextStatus });
    if (error) {
      showToast(`Failed to update status: ${error}`, 'error');
      return;
    }
    showToast(`Enquiry status updated to ${nextStatus.toUpperCase()}.`);
    setEnquiries(prev => prev.map(e => e.id === enquiryId ? { ...e, status: nextStatus } : e));
  };

  const handleStartEditNotes = (enquiry: EnquiryRow) => {
    setEditingNotesId(enquiry.id);
    setNotesDraft(enquiry.admin_notes || '');
  };

  const handleSaveNotes = async (enquiryId: string) => {
    setIsSavingNotes(true);
    const { error } = await updateEnquiryAdmin(enquiryId, { admin_notes: notesDraft.trim() || null });
    setIsSavingNotes(false);

    if (error) {
      showToast(`Failed to save notes: ${error}`, 'error');
      return;
    }
    showToast('Admin notes saved successfully.');
    setEnquiries(prev => prev.map(e => e.id === enquiryId ? { ...e, admin_notes: notesDraft.trim() || null } : e));
    setEditingNotesId(null);
  };

  const handleDeleteEnquiry = async (item: EnquiryRow) => {
    if (!window.confirm(`Delete enquiry from ${item.full_name}?`)) return;
    const { error } = await deleteEnquiryAdmin(item.id);
    if (error) {
      showToast(`Failed to delete enquiry: ${error}`, 'error');
      return;
    }
    showToast('Enquiry deleted.');
    setEnquiries(prev => prev.filter(e => e.id !== item.id));
  };

  const filteredEnquiries = enquiries.filter(item => {
    const matchesStatus = enquiryStatusFilter === 'ALL' || item.status === enquiryStatusFilter;
    const q = enquirySearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.full_name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q) ||
      item.course.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg-alternate)',
      color: 'var(--color-text-primary)',
      paddingBottom: '100px',
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-primary)',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 4px 20px rgba(59, 41, 34, 0.05)',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{
            fontFamily: "var(--font-body)",
            fontSize: '12px',
            letterSpacing: '0.2em',
            color: 'var(--color-accent)',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            Chathur Lakshana &bull; Supabase Live Portal
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 'clamp(18px, 3vw, 24px)',
            color: 'var(--color-text-heading)',
            margin: 0,
          }}>
            ADMIN DASHBOARD
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadAllData()}
            disabled={isLoading}
            style={{
              ...btnStyle,
              padding: '8px 16px',
              fontSize: '11px',
              background: 'rgba(184, 138, 50, 0.1)',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-border)',
            }}
          >
            {isLoading ? 'SYNCING...' : '↻ REFRESH'}
          </button>

          <button
            onClick={onLogout}
            style={{
              ...btnStyle,
              padding: '8px 18px',
              fontSize: '11px',
              background: 'transparent',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(184, 138, 50, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            LOGOUT
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1240px', margin: '32px auto', padding: '0 16px' }}>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Gallery Group */}
          <div style={{ display: 'flex', gap: '8px', borderRight: '2px solid var(--color-border)', paddingRight: '16px', flexWrap: 'wrap' }}>
            <button
              className={view === 'gallery_manage' ? "btn-primary" : ""}
              onClick={() => { setView('gallery_manage'); resetImgForm(); }}
              style={{
                ...btnStyle, fontSize: '11px',
                background: view === 'gallery_manage' ? undefined : 'transparent',
                color: view === 'gallery_manage' ? undefined : 'var(--color-text-heading)',
                border: view === 'gallery_manage' ? 'none' : '1px solid var(--color-border)',
              }}
            >
              GALLERY ({images.length})
            </button>
            <button
              className={view === 'gallery_add' ? "btn-primary" : ""}
              onClick={() => { resetImgForm(); setView('gallery_add'); }}
              style={{
                ...btnStyle, fontSize: '11px',
                background: view === 'gallery_add' ? undefined : 'transparent',
                color: view === 'gallery_add' ? undefined : 'var(--color-text-heading)',
                border: view === 'gallery_add' ? 'none' : '1px solid var(--color-border)',
              }}
            >
              + ADD IMAGE
            </button>
          </div>

          {/* Reels Group */}
          <div style={{ display: 'flex', gap: '8px', borderRight: '2px solid var(--color-border)', paddingRight: '16px', flexWrap: 'wrap' }}>
            <button
              className={view === 'reels_manage' ? "btn-primary" : ""}
              onClick={() => { setView('reels_manage'); resetReelForm(); }}
              style={{
                ...btnStyle, fontSize: '11px',
                background: view === 'reels_manage' ? undefined : 'transparent',
                color: view === 'reels_manage' ? undefined : 'var(--color-text-heading)',
                border: view === 'reels_manage' ? 'none' : '1px solid var(--color-border)',
              }}
            >
              REELS ({reels.length})
            </button>
            <button
              className={view === 'reels_add' ? "btn-primary" : ""}
              onClick={() => { resetReelForm(); setView('reels_add'); }}
              style={{
                ...btnStyle, fontSize: '11px',
                background: view === 'reels_add' ? undefined : 'transparent',
                color: view === 'reels_add' ? undefined : 'var(--color-text-heading)',
                border: view === 'reels_add' ? 'none' : '1px solid var(--color-border)',
              }}
            >
              + ADD REEL
            </button>
          </div>

          {/* Enquiries Group */}
          <button
            className={view === 'enquiries_manage' ? "btn-primary" : ""}
            onClick={() => setView('enquiries_manage')}
            style={{
              ...btnStyle, fontSize: '11px',
              background: view === 'enquiries_manage' ? undefined : 'transparent',
              color: view === 'enquiries_manage' ? undefined : 'var(--color-text-heading)',
              border: view === 'enquiries_manage' ? 'none' : '1px solid var(--color-border)',
            }}
          >
            ENQUIRIES ({enquiries.length})
          </button>
        </div>

        {/* Global Connection / Fetch Error Banner */}
        {fetchError && (
          <div style={{
            backgroundColor: 'rgba(229, 115, 115, 0.1)',
            border: '1px solid rgba(229, 115, 115, 0.4)',
            color: '#e57373',
            padding: '16px 20px',
            fontFamily: "var(--font-body)",
            fontSize: '14px',
            marginBottom: '24px',
            borderRadius: '4px',
            lineHeight: 1.6,
          }}>
            <strong>Supabase Notice:</strong> {fetchError}
          </div>
        )}

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                backgroundColor: toast.type === 'error' ? 'rgba(229, 115, 115, 0.15)' : 'rgba(184, 138, 50, 0.15)',
                border: `1px solid ${toast.type === 'error' ? 'rgba(229,115,115,0.4)' : 'var(--color-border)'}`,
                color: toast.type === 'error' ? '#e57373' : 'var(--color-accent)',
                padding: '16px',
                fontFamily: "var(--font-body)",
                fontSize: '14px',
                marginBottom: '24px',
                borderRadius: '4px',
              }}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state indicator */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)', fontFamily: "var(--font-body)" }}>
            Connecting to Supabase...
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            1. ADD / EDIT GALLERY IMAGE
           ───────────────────────────────────────────────────────────── */}
        {!isLoading && view === 'gallery_add' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              padding: 'clamp(20px, 4vw, 40px)',
            }}
          >
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(22px, 4vw, 32px)', color: 'var(--color-accent)', marginBottom: '28px' }}>
              {editingImageId ? 'Edit Gallery Image' : 'Add New Gallery Image'}
            </h2>

            <form onSubmit={handleSaveImage} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={labelStyle}>Image Title *</label>
              <input
                type="text"
                required
                style={inputStyle}
                value={imgTitle}
                onChange={e => setImgTitle(e.target.value)}
                placeholder="e.g. Margazhi Temple Recital"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                    value={imgCategory}
                    onChange={e => setImgCategory(e.target.value)}
                  >
                    {GALLERY_CATEGORIES.filter(c => c !== 'ALL').map(cat => (
                      <option key={cat} value={cat} style={{ background: 'var(--color-bg-primary)' }}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Display Order</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={imgDisplayOrder}
                    onChange={e => setImgDisplayOrder(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Option A: Drag and Drop Upload Zone to Supabase Storage */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ ...labelStyle, marginBottom: '10px' }}>
                  Option A: Upload Image File (Drag &amp; Drop or Browse)
                </label>

                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: isDragging
                      ? '2px dashed var(--color-accent)'
                      : '2px dashed rgba(212, 175, 101, 0.4)',
                    backgroundColor: isDragging
                      ? 'rgba(184, 138, 50, 0.12)'
                      : selectedImageFile || (imgStoragePath && imgUrl)
                      ? 'rgba(30, 9, 24, 0.65)'
                      : 'rgba(184, 138, 50, 0.03)',
                    boxShadow: isDragging ? '0 0 25px rgba(212, 175, 101, 0.25)' : 'none',
                    padding: selectedImageFile || imgStoragePath ? '20px' : '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    borderRadius: '3px',
                    position: 'relative',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploadingFile}
                    style={{ display: 'none' }}
                  />

                  {selectedImageFile || (imgStoragePath && imgUrl) ? (
                    /* Selected / Uploaded File Summary View */
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', textAlign: 'left' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {imgUrl && (
                        <img
                          src={imgUrl}
                          alt="Thumbnail preview"
                          style={{
                            width: '84px',
                            height: '84px',
                            objectFit: 'cover',
                            borderRadius: '3px',
                            border: '1px solid var(--color-border)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ flex: '1 1 220px' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '14.5px', fontWeight: 600, color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                          {selectedImageFile ? selectedImageFile.name : (imgTitle || 'Uploaded Image')}
                        </div>
                        {selectedImageFile && (
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            {formatFileSize(selectedImageFile.size)} &bull; {selectedImageFile.type || 'image'}
                          </div>
                        )}

                        {isUploadingFile ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '13px', marginTop: '6px', fontFamily: 'var(--font-body)' }}>
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--color-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <span>Uploading to Supabase Storage...</span>
                          </div>
                        ) : imgStoragePath ? (
                          <div style={{ color: '#81C784', fontSize: '12px', marginTop: '6px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>✓ Stored in Supabase bucket: <code>{imgStoragePath}</code></span>
                          </div>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            ...btnStyle,
                            padding: '8px 14px',
                            fontSize: '11px',
                            background: 'rgba(184, 138, 50, 0.1)',
                            color: 'var(--color-accent)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          CHANGE FILE
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveSelectedFile}
                          style={{
                            ...btnStyle,
                            padding: '8px 14px',
                            fontSize: '11px',
                            background: 'rgba(229, 115, 115, 0.1)',
                            color: '#e57373',
                            border: '1px solid rgba(229, 115, 115, 0.3)',
                          }}
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty Dropzone Invitation View */
                    <div>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: isDragging ? 'rgba(212, 175, 101, 0.25)' : 'rgba(212, 175, 101, 0.1)',
                        border: '1px solid var(--color-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        color: 'var(--color-accent)',
                        transition: 'all 0.25s ease',
                      }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>

                      <div style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        letterSpacing: '0.06em',
                        marginBottom: '6px',
                      }}>
                        {isDragging ? 'DROP IMAGE FILE HERE' : 'DRAG & DROP IMAGE HERE'}
                      </div>

                      <div style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '10px',
                      }}>
                        or <span style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>click to browse from your device</span>
                      </div>

                      <div style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '11px',
                        color: 'var(--color-text-secondary)',
                        opacity: 0.8,
                      }}>
                        Supports JPG, PNG, WEBP, GIF (Up to 10MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Divider */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                margin: '4px 0 16px',
              }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  color: 'var(--color-accent)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}>
                  OR ENTER DIRECT PUBLIC IMAGE URL
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
              </div>

              {/* Direct Image URL input */}
              <label style={labelStyle}>Option B: Direct Public Image URL</label>
              <input
                type="url"
                style={inputStyle}
                value={imgUrl}
                onChange={e => {
                  setImgUrl(e.target.value);
                  setImgStoragePath(null);
                  setSelectedImageFile(null);
                }}
                placeholder="https://example.com/photo.jpg"
              />

              {/* Preview when using direct URL */}
              {imgUrl && !selectedImageFile && !imgUrl.startsWith('blob:') && <ImagePreview url={imgUrl} />}

              <label style={labelStyle}>Description (Optional)</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                value={imgDescription}
                onChange={e => setImgDescription(e.target.value)}
                placeholder="Brief description or context..."
              />

              {/* Publish Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <input
                  type="checkbox"
                  id="img-published-chk"
                  checked={imgIsPublished}
                  onChange={e => setImgIsPublished(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                />
                <label htmlFor="img-published-chk" style={{ fontFamily: "var(--font-body)", fontSize: '14px', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                  Publish this image to the public website gallery
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={isSaving || isUploadingFile}
                  className="btn-primary"
                  style={{
                    ...btnStyle,
                    flex: '1 1 200px',
                    opacity: isSaving || isUploadingFile ? 0.7 : 1,
                    cursor: isSaving || isUploadingFile ? 'wait' : 'pointer',
                  }}
                >
                  {isSaving ? 'SAVING TO SUPABASE...' : editingImageId ? 'UPDATE IMAGE' : 'SAVE IMAGE TO SUPABASE'}
                </button>

                <button
                  type="button"
                  onClick={() => { setView('gallery_manage'); resetImgForm(); }}
                  style={{
                    ...btnStyle,
                    flex: '1 1 120px',
                    background: 'transparent',
                    color: 'var(--color-text-heading)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            2. MANAGE GALLERY IMAGES
           ───────────────────────────────────────────────────────────── */}
        {!isLoading && view === 'gallery_manage' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(22px, 4vw, 32px)', color: 'var(--color-accent)', margin: 0 }}>
                Manage Gallery Images
              </h2>
              <button
                className="btn-primary"
                onClick={() => { resetImgForm(); setView('gallery_add'); }}
                style={{ ...btnStyle, fontSize: '12px' }}
              >
                + ADD IMAGE
              </button>
            </div>

            {images.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)', fontFamily: "var(--font-body)" }}>
                No gallery images found in Supabase. Click <strong>+ ADD IMAGE</strong> to upload.
              </div>
            ) : (
              <div className="admin-media-grid">
                {images.map(item => (
                  <div key={item.id} style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                    <div style={{ height: '180px', overflow: 'hidden', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <img
                        src={item.image_url}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: item.is_published ? 'rgba(76, 175, 80, 0.9)' : 'rgba(229, 115, 115, 0.9)',
                        color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', letterSpacing: '0.1em'
                      }}>
                        {item.is_published ? 'PUBLISHED' : 'DRAFT'}
                      </div>
                      <div style={{
                        position: 'absolute', bottom: '8px', left: '8px',
                        background: 'rgba(0,0,0,0.65)', color: 'var(--color-accent)', fontSize: '10px', padding: '2px 6px'
                      }}>
                        Order: {item.display_order ?? 0}
                      </div>
                    </div>

                    <div style={{ padding: '16px' }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        {item.category || 'GALLERY'}
                      </div>
                      <h4 style={{ fontFamily: "var(--font-display)", fontSize: '18px', color: 'var(--color-text-heading)', marginBottom: '8px', lineHeight: 1.3 }}>
                        {item.title}
                      </h4>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.image_url}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleEditImage(item)}
                          style={{ ...btnStyle, padding: '8px 12px', fontSize: '11px', flex: '1 1 60px', background: 'rgba(184, 138, 50, 0.1)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleToggleImagePublished(item)}
                          style={{ ...btnStyle, padding: '8px 12px', fontSize: '11px', flex: '1 1 60px', background: item.is_published ? 'rgba(100,100,100,0.1)' : 'rgba(76,175,80,0.15)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                        >
                          {item.is_published ? 'UNPUBLISH' : 'PUBLISH'}
                        </button>
                        <button
                          onClick={() => handleDeleteImage(item)}
                          style={{ ...btnStyle, padding: '8px 12px', fontSize: '11px', flex: '1 1 60px', background: 'rgba(229, 115, 115, 0.1)', color: '#e57373', border: '1px solid rgba(229, 115, 115, 0.3)' }}
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. ADD / EDIT REEL
           ───────────────────────────────────────────────────────────── */}
        {!isLoading && view === 'reels_add' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              padding: 'clamp(20px, 4vw, 40px)',
            }}
          >
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(22px, 4vw, 32px)', color: 'var(--color-accent)', marginBottom: '28px' }}>
              {reelEditingId ? 'Edit Reel / Video' : 'Add Reel / Video to Supabase'}
            </h2>

            <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(184,138,50,0.07)', border: '1px solid var(--color-border)', fontFamily: "var(--font-body)", fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--color-accent)' }}>Supported formats:</strong> Instagram Reels (e.g. <code>https://www.instagram.com/reel/CODE/</code>), YouTube, YouTube Shorts, or direct video MP4 URLs.
            </div>

            <form onSubmit={handleSaveReel} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={labelStyle}>Reel Title *</label>
              <input
                type="text"
                required
                style={inputStyle}
                value={reelTitle}
                onChange={e => setReelTitle(e.target.value)}
                placeholder="e.g. Navarasa Expressions Reel"
              />

              <label style={labelStyle}>Instagram / Video URL *</label>
              <input
                type="url"
                required
                style={{ ...inputStyle, marginBottom: reelUrlError ? '4px' : '20px' }}
                value={reelUrl}
                onChange={e => { setReelUrl(e.target.value); setReelUrlError(''); }}
                placeholder="https://www.instagram.com/reel/... or https://youtube.com/watch?v=..."
              />
              {reelUrlError && (
                <div style={{ color: '#e57373', fontSize: '13px', fontFamily: "var(--font-body)", marginBottom: '16px' }}>
                  ⚠ {reelUrlError}
                </div>
              )}

              {/* Live preview */}
              {reelUrl && isValidUrl(reelUrl) && <ReelPreview url={reelUrl} />}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Thumbnail URL (Optional)</label>
                  <input
                    type="url"
                    style={inputStyle}
                    value={reelThumbnailUrl}
                    onChange={e => setReelThumbnailUrl(e.target.value)}
                    placeholder="https://example.com/thumb.jpg"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Display Order</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={reelDisplayOrder}
                    onChange={e => setReelDisplayOrder(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>

              <label style={labelStyle}>Description (Optional)</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                value={reelDescription}
                onChange={e => setReelDescription(e.target.value)}
                placeholder="Brief description or context..."
              />

              {/* Publish Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <input
                  type="checkbox"
                  id="reel-published-chk"
                  checked={reelIsPublished}
                  onChange={e => setReelIsPublished(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                />
                <label htmlFor="reel-published-chk" style={{ fontFamily: "var(--font-body)", fontSize: '14px', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                  Publish this reel to the public website
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
                  style={{
                    ...btnStyle,
                    flex: '1 1 200px',
                    opacity: isSaving ? 0.7 : 1,
                    cursor: isSaving ? 'wait' : 'pointer',
                  }}
                >
                  {isSaving ? 'SAVING TO SUPABASE...' : reelEditingId ? 'UPDATE REEL' : 'SAVE REEL TO SUPABASE'}
                </button>

                <button
                  type="button"
                  onClick={() => { setView('reels_manage'); resetReelForm(); }}
                  style={{
                    ...btnStyle,
                    flex: '1 1 120px',
                    background: 'transparent',
                    color: 'var(--color-text-heading)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            4. MANAGE REELS
           ───────────────────────────────────────────────────────────── */}
        {!isLoading && view === 'reels_manage' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(22px, 4vw, 32px)', color: 'var(--color-accent)', margin: 0 }}>
                Manage Reels &amp; Videos
              </h2>
              <button
                className="btn-primary"
                onClick={() => { resetReelForm(); setView('reels_add'); }}
                style={{ ...btnStyle, fontSize: '12px' }}
              >
                + ADD REEL
              </button>
            </div>

            {reels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)', fontFamily: "var(--font-body)" }}>
                No reels found in Supabase. Click <strong>+ ADD REEL</strong> to add one.
              </div>
            ) : (
              <div className="admin-media-grid">
                {reels.map(item => {
                  const urlType = detectReelUrlType(item.instagram_url);
                  return (
                    <div key={item.id} style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                      <div style={{ position: 'relative' }}>
                        {(urlType === 'youtube' || urlType === 'youtube_short') && (() => {
                          const embedUrl = getYouTubeEmbedUrl(item.instagram_url);
                          return embedUrl ? (
                            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
                              <iframe
                                src={embedUrl}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={item.title}
                              />
                            </div>
                          ) : null;
                        })()}

                        {urlType === 'instagram' && (
                          <div style={{ padding: '24px 16px', background: 'var(--color-bg-secondary)', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📱</div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: '13px', color: 'var(--color-accent)' }}>Instagram Reel</div>
                          </div>
                        )}

                        {urlType === 'direct_video' && (
                          <video src={item.instagram_url} controls style={{ width: '100%', maxHeight: '200px', display: 'block', background: '#000' }} />
                        )}

                        {urlType === 'unsupported' && (
                          <div style={{ padding: '20px', background: 'var(--color-bg-secondary)', textAlign: 'center' }}>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: '13px', color: '#e57373' }}>⚠ Custom Reel Link</div>
                          </div>
                        )}

                        <div style={{
                          position: 'absolute', top: '8px', right: '8px',
                          background: item.is_published ? 'rgba(76, 175, 80, 0.9)' : 'rgba(229, 115, 115, 0.9)',
                          color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', letterSpacing: '0.1em'
                        }}>
                          {item.is_published ? 'PUBLISHED' : 'DRAFT'}
                        </div>
                      </div>

                      <div style={{ padding: '16px' }}>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          {urlType.replace('_', ' ')} &bull; Order: {item.display_order ?? 0}
                        </div>
                        <h4 style={{ fontFamily: "var(--font-display)", fontSize: '18px', color: 'var(--color-text-heading)', marginBottom: '8px', lineHeight: 1.3 }}>
                          {item.title}
                        </h4>
                        {item.description && (
                          <p style={{ fontFamily: "var(--font-body)", fontSize: '13.5px', color: 'var(--color-text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                            {item.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleEditReel(item)}
                            style={{ ...btnStyle, padding: '8px 12px', fontSize: '11px', flex: '1 1 60px', background: 'rgba(184, 138, 50, 0.1)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleToggleReelPublished(item)}
                            style={{ ...btnStyle, padding: '8px 12px', fontSize: '11px', flex: '1 1 60px', background: item.is_published ? 'rgba(100,100,100,0.1)' : 'rgba(76,175,80,0.15)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                          >
                            {item.is_published ? 'UNPUBLISH' : 'PUBLISH'}
                          </button>
                          <button
                            onClick={() => handleDeleteReel(item)}
                            style={{ ...btnStyle, padding: '8px 12px', fontSize: '11px', flex: '1 1 60px', background: 'rgba(229, 115, 115, 0.1)', color: '#e57373', border: '1px solid rgba(229, 115, 115, 0.3)' }}
                          >
                            DELETE
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            5. MANAGE ENQUIRIES (NEW SECTION)
           ───────────────────────────────────────────────────────────── */}
        {!isLoading && view === 'enquiries_manage' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(22px, 4vw, 32px)', color: 'var(--color-accent)', margin: 0 }}>
                  Student &amp; Visitor Enquiries
                </h2>
                <div style={{ fontFamily: "var(--font-body)", fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Live enquiries submitted via the website into <code>public.enquiries</code>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px',
              flexWrap: 'wrap',
              backgroundColor: 'var(--color-bg-primary)',
              padding: '16px',
              border: '1px solid var(--color-border)',
            }}>
              <input
                type="text"
                placeholder="Search by name, email, phone, or course..."
                value={enquirySearch}
                onChange={e => setEnquirySearch(e.target.value)}
                style={{
                  ...inputStyle,
                  marginBottom: 0,
                  flex: '1 1 260px',
                  fontSize: '14px',
                  padding: '10px 14px',
                }}
              />

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(['ALL', 'new', 'contacted', 'completed', 'cancelled'] as const).map(st => {
                  const isActive = enquiryStatusFilter === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setEnquiryStatusFilter(st)}
                      style={{
                        ...btnStyle,
                        padding: '8px 14px',
                        fontSize: '11px',
                        background: isActive ? 'var(--color-accent)' : 'transparent',
                        color: isActive ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {st.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredEnquiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)', fontFamily: "var(--font-body)" }}>
                {enquiries.length === 0
                  ? 'No visitor enquiries submitted yet.'
                  : 'No enquiries match the current filter criteria.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredEnquiries.map(enq => {
                  const statusColors: Record<EnquiryStatus, { bg: string; text: string; border: string }> = {
                    new: { bg: 'rgba(212, 175, 101, 0.15)', text: 'var(--color-accent)', border: 'var(--color-accent)' },
                    contacted: { bg: 'rgba(33, 150, 243, 0.15)', text: '#64B5F6', border: '#2196F3' },
                    completed: { bg: 'rgba(76, 175, 80, 0.15)', text: '#81C784', border: '#4CAF50' },
                    cancelled: { bg: 'rgba(229, 115, 115, 0.15)', text: '#e57373', border: '#e57373' },
                  };
                  const currentSt = statusColors[enq.status] || statusColors.new;

                  return (
                    <div
                      key={enq.id}
                      style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        padding: '24px',
                        borderRadius: '2px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <h3 style={{ fontFamily: "var(--font-display)", fontSize: '20px', color: 'var(--color-text-heading)', margin: 0 }}>
                              {enq.full_name}
                            </h3>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.12em',
                              padding: '2px 8px',
                              borderRadius: '2px',
                              background: currentSt.bg,
                              color: currentSt.text,
                              border: `1px solid ${currentSt.border}`,
                              textTransform: 'uppercase',
                            }}>
                              {enq.status}
                            </span>
                          </div>

                          <div style={{ fontFamily: "var(--font-body)", fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <span><strong>Course:</strong> {enq.course}</span>
                            <span><strong>Contact Mode:</strong> {enq.preferred_contact}</span>
                            <span><strong>Submitted:</strong> {new Date(enq.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Status switcher dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Status:</span>
                          <select
                            value={enq.status}
                            onChange={e => handleUpdateEnquiryStatus(enq.id, e.target.value as EnquiryStatus)}
                            style={{
                              background: 'var(--color-bg-secondary)',
                              color: 'var(--color-text-primary)',
                              border: '1px solid var(--color-border)',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontFamily: 'var(--font-body)',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="new">NEW</option>
                            <option value="contacted">CONTACTED</option>
                            <option value="completed">COMPLETED</option>
                            <option value="cancelled">CANCELLED</option>
                          </select>
                        </div>
                      </div>

                      {/* Contact Info Row */}
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', fontSize: '13.5px', fontFamily: 'var(--font-body)' }}>
                        <div>
                          <strong>Phone: </strong>
                          <a href={`tel:${enq.phone}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                            {enq.phone}
                          </a>
                        </div>
                        <div>
                          <strong>Email: </strong>
                          <a href={`mailto:${enq.email}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                            {enq.email}
                          </a>
                        </div>
                        <div>
                          <a
                            href={`https://wa.me/${enq.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${enq.full_name}, thank you for reaching out to Chathur Lakshana Academy regarding ${enq.course}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#25D366',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontWeight: 600,
                              fontSize: '13px',
                            }}
                          >
                            💬 Chat on WhatsApp
                          </a>
                        </div>
                      </div>

                      {/* Message Body */}
                      <div>
                        <div style={{ fontSize: '11px', letterSpacing: '0.15em', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Visitor Message:
                        </div>
                        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '14.5px', color: 'var(--color-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {enq.message || '(No extra notes provided)'}
                        </p>
                      </div>

                      {/* Admin Notes Section */}
                      <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', letterSpacing: '0.15em', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                            Admin Internal Notes:
                          </span>
                          {editingNotesId !== enq.id && (
                            <button
                              onClick={() => handleStartEditNotes(enq)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                            >
                              {enq.admin_notes ? 'Edit Notes' : '+ Add Note'}
                            </button>
                          )}
                        </div>

                        {editingNotesId === enq.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea
                              rows={2}
                              value={notesDraft}
                              onChange={e => setNotesDraft(e.target.value)}
                              placeholder="Record internal notes (e.g. called on 25 Oct, interested in weekend batch)..."
                              style={{ ...inputStyle, marginBottom: 0, fontSize: '13.5px', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleSaveNotes(enq.id)}
                                disabled={isSavingNotes}
                                className="btn-primary"
                                style={{ ...btnStyle, padding: '6px 16px', fontSize: '11px' }}
                              >
                                {isSavingNotes ? 'SAVING...' : 'SAVE NOTES'}
                              </button>
                              <button
                                onClick={() => setEditingNotesId(null)}
                                style={{ ...btnStyle, padding: '6px 12px', fontSize: '11px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                              >
                                CANCEL
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: enq.admin_notes ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontStyle: enq.admin_notes ? 'normal' : 'italic' }}>
                            {enq.admin_notes || 'No internal notes saved yet.'}
                          </div>
                        )}
                      </div>

                      {/* Delete Action */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                        <button
                          onClick={() => handleDeleteEnquiry(enq)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#e57373',
                            fontSize: '11px',
                            cursor: 'pointer',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Delete Enquiry
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Responsive Styles */}
      <style>{`
        .admin-media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        @media (max-width: 480px) {
          .admin-media-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
