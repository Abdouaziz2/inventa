import { useState, useEffect, useRef } from 'react';
import { useProfileSettings, useUpdateProfileSettings } from '@/hooks/useProfileSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Upload, X, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { uploadCompanyAsset } from '@/services/storage';
import { getCurrentProfile } from '@/services/auth';

const CompanySettingsPage = () => {
  const { data: settings, isLoading } = useProfileSettings();
  const { user, refreshUser } = useAuth();
  const updateMutation = useUpdateProfileSettings();

  const [fullName, setFullName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setFullName(settings.full_name);
      setName(settings.business_name);
      setPhone(settings.phone);
      setAddress(settings.address);
      setLogoUrl(settings.logo);
      setSecondaryPhone(settings.secondary_phone);
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    setUploading(true);
    try {
      let companyId = settings.company_id ?? user?.companyId ?? null;

      if (!companyId) {
        const result = await updateMutation.mutateAsync({
          id: settings.id,
          full_name: fullName,
          business_name: name || 'Ma boutique',
          phone,
          secondary_phone: secondaryPhone,
          address,
          logo: logoUrl,
        });

        companyId = result.company_id;
        await refreshUser();
      }

      if (!companyId) {
        const profile = await getCurrentProfile();
        companyId = profile?.companyId ?? null;
      }

      if (!companyId) throw new Error("Enregistrez d'abord les informations de la boutique");
      const upload = await uploadCompanyAsset(companyId, user?.id ?? settings.id, file, 'branding');
      setLogoUrl(upload.url);
      toast.success('Logo uploadé');
    } catch (error: unknown) {
      toast.error('Erreur upload: ' + getErrorMessage(error));
    }
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await updateMutation.mutateAsync({
        id: settings.id,
        full_name: fullName,
        business_name: name,
        phone,
        secondary_phone: secondaryPhone,
        address,
        logo: logoUrl,
      });
      await refreshUser();
      toast.success('Profil mis à jour');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
          <h1 className="page-title flex items-center gap-2">
          <UserCog className="h-6 w-6 text-muted-foreground" />
          Profil de la boutique
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ces informations seront affichées dans l'application et sur les factures et reçus
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo et identité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative">
              {logoUrl ? (
                <div className="relative">
                  <img src={logoUrl} alt="Logo" className="h-20 w-20 rounded-xl object-cover border border-border" />
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                </div>
              )}
            </div>
            <div className="w-full sm:w-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full sm:w-auto">
                {uploading ? 'Upload...' : 'Changer le logo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations du profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Ex: Abdoulaye Ndiaye" />
            </div>
            <div className="space-y-2">
              <Label>Nom de la boutique</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Bijouterie Diamant" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone principal</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex: +221 77 123 45 67" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone secondaire</Label>
              <Input value={secondaryPhone} onChange={e => setSecondaryPhone(e.target.value)} placeholder="Ex: +221 76 123 45 67" />
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex: Marché Sandaga, Dakar, Sénégal" rows={3} />
            </div>
            <Button type="submit" disabled={updateMutation.isPending} className="w-full gold-gradient text-accent-foreground font-semibold sm:w-auto">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySettingsPage;
