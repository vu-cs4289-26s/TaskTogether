const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Upload an image file to S3 via the backend and return the public URL.
 */
export async function uploadImageApi(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const form = new FormData();
  form.append('photo', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || 'Image upload failed. Try an image with smaller file size or different format.');
  }

  const json = await res.json();
  return json.data.url as string;
}
