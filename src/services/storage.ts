import { supabase } from '@/lib/supabase';

const BUCKET = 'jewelry-images';

export async function uploadJewelryImage(companyId: string, userId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${companyId}/${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;
  return path;
}

export async function getJewelryImageUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}
