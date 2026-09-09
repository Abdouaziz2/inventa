import { useState, useEffect, useRef } from 'react';
import { useProfileSettings, useUpdateProfileSettings } from '@/hooks/useProfileSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Upload, X, UserCog, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { uploadCompanyAsset } from '@/services/storage';
import { getCurrentProfile } from '@/services/auth';
import AdaptiveLogo from '@/components/AdaptiveLogo';
import { usePurgeTestData } from '@/features/transactions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const ALLOWED_LOGO_EXTENSIONS = '.png,.jpg,.jpeg,.webp';

const CompanySettingsPage = () => {
  const { data: settings, isLoading } = useProfileSettings();
  const { user, refreshUser, isAdmin } = useAuth();
  const updateMutation = useUpdateProfileSettings();
  const purgeTestData = usePurgeTestData();

  const [fullName, setFullName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoValue, setLogoValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [purgeConfirmation, setPurgeConfirmation] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setFullName(settings.full_name);
      setName(settings.business_name);
      setPhone(settings.phone);
      setAddress(settings.address);
      setLogoUrl(settings.logo);
      setLogoValue(settings.logo_path);
      setSecondaryPhone(settings.secondary_phone);
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error('Formats acceptes: PNG, JPG, JPEG, WEBP');
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
          logo: logoValue,
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
      setLogoValue(upload.path);

      await updateMutation.mutateAsync({
        id: settings.id,
        full_name: fullName,
        business_name: name || 'Ma boutique',
        phone,
        secondary_phone: secondaryPhone,
        address,
        logo: upload.path,
      });

      await refreshUser();
      toast.success('Logo mis a jour');
    } catch (error: unknown) {
      toast.error('Erreur upload: ' + getErrorMessage(error));
    }
    if (fileRef.current) {
      fileRef.current.value = '';
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
        logo: logoValue,
      });
      await refreshUser();
      toast.success('Profil mis à jour');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handlePurgeTestData = async () => {
    try {
      const counts = await purgeTestData.mutateAsync(purgeConfirmation);
      const total = Object.values(counts ?? {}).reduce((sum, count) => sum + Number(count ?? 0), 0);
      toast.success(`${total} élément(s) test supprimé(s)`);
      setShowPurgeDialog(false);
      setPurgeConfirmation('');
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
                  <AdaptiveLogo src={logoUrl} alt="Logo de la bijouterie" className="h-24 w-24 rounded-xl border border-border shadow-sm" />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('');
                      setLogoValue('');
                    }}
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
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_LOGO_EXTENSIONS}
              className="hidden"
              onChange={handleLogoUpload}
            />
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

      {isAdmin ? (
        <Card className="border-destructive/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Nettoyage données test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Supprime les clients, bijoux, ventes, dépôts, réservations, commandes et mouvements de test de cette
              boutique. Les utilisateurs, la boutique et l’abonnement restent conservés.
            </p>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowPurgeDialog(true)}
              disabled={purgeTestData.isPending}
            >
              Réinitialiser les données test
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={showPurgeDialog} onOpenChange={(open) => {
        setShowPurgeDialog(open);
        if (!open) setPurgeConfirmation('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer les données test ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action efface les opérations métier de la boutique actuelle. Pour confirmer, tapez SUPPRIMER TEST.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="purge-confirmation">Confirmation</Label>
            <Input
              id="purge-confirmation"
              value={purgeConfirmation}
              onChange={(event) => setPurgeConfirmation(event.target.value)}
              placeholder="SUPPRIMER TEST"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={purgeConfirmation !== 'SUPPRIMER TEST' || purgeTestData.isPending}
              onClick={() => void handlePurgeTestData()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {purgeTestData.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanySettingsPage;
