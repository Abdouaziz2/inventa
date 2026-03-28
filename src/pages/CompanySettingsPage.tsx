import { useState, useEffect } from 'react';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const CompanySettingsPage = () => {
  const { data: settings, isLoading } = useCompanySettings();
  const updateMutation = useUpdateCompanySettings();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (settings) {
      setName(settings.name);
      setPhone(settings.phone);
      setAddress(settings.address);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await updateMutation.mutateAsync({ id: settings.id, name, phone, address });
      toast.success('Paramètres enregistrés');
    } catch (err: any) {
      toast.error(err.message);
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-muted-foreground" />
          Paramètres de l'entreprise
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ces informations apparaissent dans l'application et sur les factures/reçus
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l'entreprise</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Bijouterie Diamant" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex: +221 77 123 45 67" />
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex: Marché Sandaga, Dakar, Sénégal" rows={3} />
            </div>
            <Button type="submit" disabled={updateMutation.isPending} className="gold-gradient text-accent-foreground font-semibold">
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
