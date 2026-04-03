import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useClients, useAddClient } from '@/hooks/useDatabase';
import { formatCFA } from '@/lib/format';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';

const ClientsPage = () => {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const { data: clients = [], isLoading } = useClients();
  const addClient = useAddClient();

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search) ||
    c.phone.replace(/\s/g, '').includes(search.replace(/\s/g, ''))
  );

  const handleAddClient = async () => {
    if (!newName.trim()) return;
    try {
      await addClient.mutateAsync({ name: newName.trim(), phone: newPhone.trim() });
      toast.success('Client ajouté avec succès');
      setShowAdd(false);
      setNewName('');
      setNewPhone('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm">{clients.length} clients enregistrés</p>
        </div>
        <Button size="sm" className="gold-gradient text-accent-foreground hover:opacity-90" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau Client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, code ou téléphone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">CODE</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">NOM</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">TÉLÉPHONE</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">SOLDE</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => (
                <tr key={client.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-mono font-medium">{client.code}</td>
                  <td className="px-5 py-3.5 text-sm font-medium">{client.name}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {client.phone}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-right">
                    <span className={client.balance > 0 ? 'text-success' : 'text-muted-foreground'}>
                      {formatCFA(client.balance)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/clients/${client.id}`}>Détails</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !isLoading && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun client trouvé</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Aminata Diop" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+221 77 123 45 67" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleAddClient} disabled={!newName.trim() || addClient.isPending} className="gold-gradient text-accent-foreground hover:opacity-90">
              {addClient.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
