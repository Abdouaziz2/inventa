import { useState } from 'react';
import { Search, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { mockClients } from '@/data/mock';
import { toast } from 'sonner';

const DepositsPage = () => {
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<typeof mockClients[0] | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showResults, setShowResults] = useState(false);

  const results = clientSearch.length > 0 ? mockClients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.code.includes(clientSearch)
  ) : [];

  const handleValidate = () => {
    if (!selectedClient || !amount) return;
    toast.success(`Dépôt de ${Number(amount).toLocaleString()} MAD enregistré pour ${selectedClient.name}`);
    setSelectedClient(null);
    setAmount('');
    setNote('');
    setClientSearch('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Dépôt Libre</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 bg-card rounded-xl p-6 card-shadow space-y-5">
          <div className="space-y-2 relative">
            <Label>Client</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={selectedClient ? `${selectedClient.code} - ${selectedClient.name}` : clientSearch}
                onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                className="pl-9"
              />
            </div>
            {showResults && results.length > 0 && !selectedClient && (
              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                {results.map(c => (
                  <button key={c.id} onClick={() => { setSelectedClient(c); setShowResults(false); }}
                    className="w-full px-4 py-2.5 text-left hover:bg-muted flex justify-between items-center text-sm">
                    <span><span className="font-mono font-medium">{c.code}</span> — {c.name}</span>
                    <span className="text-muted-foreground">{c.balance.toLocaleString()} MAD</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Montant (MAD)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" className="text-lg font-semibold h-12" />
          </div>

          <div className="space-y-2">
            <Label>Note (optionnel)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Acompte pour bague..." rows={3} />
          </div>

          <Button onClick={handleValidate} disabled={!selectedClient || !amount} className="w-full h-11 gold-gradient text-accent-foreground hover:opacity-90 font-semibold">
            <CheckCircle className="h-4 w-4 mr-2" /> Valider le Dépôt
          </Button>
        </div>

        {/* Receipt Preview */}
        <div className="lg:col-span-2 bg-card rounded-xl p-6 card-shadow border-2 border-dashed border-border">
          <h3 className="text-sm font-semibold mb-4">Aperçu du Reçu</h3>
          {selectedClient && amount ? (
            <div className="space-y-4 text-sm">
              <div className="text-center border-b border-border pb-3">
                <p className="font-display text-lg font-bold">JewelStock</p>
                <p className="text-xs text-muted-foreground">Reçu de Dépôt</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Client:</span><span className="font-medium">{selectedClient.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Code:</span><span className="font-mono">{selectedClient.code}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span>{new Date().toLocaleDateString('fr-FR')}</span></div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Montant:</span>
                  <span>{Number(amount).toLocaleString()} MAD</span>
                </div>
              </div>
              {note && <p className="text-xs text-muted-foreground italic">Note: {note}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sélectionnez un client et entrez un montant pour voir l'aperçu</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepositsPage;
