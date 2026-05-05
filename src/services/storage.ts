import { supabase } from '@/lib/supabase';

const BUCKET = 'jewelry-images';

export async function uploadCompanyAsset(companyId: string, userId: string, file: File, folder = 'jewelry') {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${companyId}/${folder}/${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;
  const url = await getJewelryImageUrl(path);
  return { path, url };
}

export async function getJewelryImageUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadJewelryImage(companyId: string, userId: string, file: File) {
  return uploadCompanyAsset(companyId, userId, file, 'jewelry');
}
