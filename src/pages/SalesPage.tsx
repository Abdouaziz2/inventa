import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockClients, mockJewelry } from '@/data/mock';
import { toast } from 'sonner';
import { ShoppingBag } from 'lucide-react';

const SalesPage = () => {
  const [clientId, setClientId] = useState('');
  const [jewelryId, setJewelryId] = useState('');

  const client = mockClients.find(c => c.id === clientId);
  const jewelry = mockJewelry.find(j => j.id === jewelryId);

  const balanceUsed = client && jewelry ? Math.min(client.balance, jewelry.salePrice) : 0;
  const remaining = jewelry ? jewelry.salePrice - balanceUsed : 0;

  const handleSubmit = () => {
    toast.success('Vente enregistrée avec succès');
    setClientId(''); setJewelryId('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Nouvelle Vente</h1>

      <div className="bg-card rounded-xl p-6 card-shadow space-y-5">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
            <SelectContent>
              {mockClients.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name} ({c.balance.toLocaleString()} MAD)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bijou</Label>
          <Select value={jewelryId} onValueChange={setJewelryId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un bijou..." /></SelectTrigger>
            <SelectContent>
              {mockJewelry.filter(j => j.status === 'available' || j.status === 'reserved').map(j => (
                <SelectItem key={j.id} value={j.id}>{j.name} — {j.salePrice.toLocaleString()} MAD</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {client && jewelry && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Prix du bijou:</span><span className="font-medium">{jewelry.salePrice.toLocaleString()} MAD</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Solde client:</span><span className="font-medium">{client.balance.toLocaleString()} MAD</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payé via solde:</span><span className="font-medium text-success">-{balanceUsed.toLocaleString()} MAD</span></div>
            <div className="flex justify-between text-base font-bold border-t border-border pt-2">
              <span>Reste à régler:</span>
              <span className={remaining === 0 ? 'text-success' : ''}>{remaining.toLocaleString()} MAD</span>
            </div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={!clientId || !jewelryId} className="w-full h-11 gold-gradient text-accent-foreground hover:opacity-90 font-semibold">
          <ShoppingBag className="h-4 w-4 mr-2" /> Valider la Vente
        </Button>
      </div>
    </div>
  );
};

export default SalesPage;
