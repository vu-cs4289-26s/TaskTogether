'use client';

import { useState, useCallback } from 'react';

export type Preview = { id: string; url: string; file: File };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function validateFiles(files: File[]) {
  const ok: File[] = [];
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    if (f.size > 10 * 1024 * 1024) continue; // 10 MB
    ok.push(f);
  }
  return ok;
}

export default function useImageUpload(maxFiles = 1) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addFiles = useCallback(
    (filesLike: FileList | File[]) => {
      const files = validateFiles(Array.from(filesLike));
      if (files.length === 0) return;

      setPreviews((prev) => {
        // Revoke old previews when replacing (single-image mode)
        if (maxFiles === 1) {
          for (const p of prev) URL.revokeObjectURL(p.url);
          const file = files[0];
          return [{ id: uid(), url: URL.createObjectURL(file), file }];
        }

        const newPreviews = files.slice(0, maxFiles - prev.length).map((file) => ({
          id: uid(),
          url: URL.createObjectURL(file),
          file,
        }));
        return [...prev, ...newPreviews];
      });
      setUploadError(null);
    },
    [maxFiles],
  );

  const removePreview = useCallback((id: string) => {
    setPreviews((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const clearPreviews = useCallback(() => {
    setPreviews((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.url);
      return [];
    });
    setUploadError(null);
  }, []);

  return {
    previews,
    uploading,
    setUploading,
    uploadError,
    setUploadError,
    addFiles,
    removePreview,
    clearPreviews,
  };
}
