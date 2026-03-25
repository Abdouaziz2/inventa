import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockClients, mockJewelry } from '@/data/mock';
import { toast } from 'sonner';
import { BookmarkCheck } from 'lucide-react';

const ReservationsPage = () => {
  const [clientId, setClientId] = useState('');
  const [jewelryId, setJewelryId] = useState('');
  const [deposit, setDeposit] = useState('');

  const client = mockClients.find(c => c.id === clientId);
  const jewelry = mockJewelry.find(j => j.id === jewelryId);
  const remaining = jewelry ? jewelry.salePrice - Number(deposit || 0) : 0;

  const handleSubmit = () => {
    toast.success('Réservation enregistrée');
    setClientId(''); setJewelryId(''); setDeposit('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Réservation de Bijou</h1>

      <div className="bg-card rounded-xl p-6 card-shadow space-y-5">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
            <SelectContent>
              {mockClients.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bijou</Label>
          <Select value={jewelryId} onValueChange={setJewelryId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un bijou..." /></SelectTrigger>
            <SelectContent>
              {mockJewelry.filter(j => j.status === 'available').map(j => (
                <SelectItem key={j.id} value={j.id}>{j.name} — {j.salePrice.toLocaleString()} MAD</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Montant de l'acompte (MAD)</Label>
          <Input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="10000" className="h-11" />
        </div>

        {jewelry && deposit && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Prix total:</span><span className="font-medium">{jewelry.salePrice.toLocaleString()} MAD</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Acompte:</span><span className="font-medium text-success">{Number(deposit).toLocaleString()} MAD</span></div>
            <div className="flex justify-between text-base font-bold border-t border-border pt-2"><span>Reste à payer:</span><span>{remaining.toLocaleString()} MAD</span></div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={!clientId || !jewelryId || !deposit} className="w-full h-11 gold-gradient text-accent-foreground hover:opacity-90 font-semibold">
          <BookmarkCheck className="h-4 w-4 mr-2" /> Confirmer la Réservation
        </Button>
      </div>
    </div>
  );
};

export default ReservationsPage;
