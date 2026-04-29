import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useClients, useAddClient, filterClients } from '@/features/clients';
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

  const filteredClients = filterClients(clients, search);

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
    <div className="page-shell animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">Clients</h1>
          <p className="text-muted-foreground text-sm">{clients.length} clients enregistrés</p>
        </div>
        <Button size="sm" className="w-full justify-center gold-gradient text-accent-foreground hover:opacity-90 sm:w-auto" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau Client
        </Button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, code ou téléphone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-xl bg-card card-shadow">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : filteredClients.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun client trouvé</div>
        ) : (
          <>
          <table className="hidden w-full md:table">
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
              {filteredClients.map(client => (
                <tr key={client.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-mono font-medium">{client.code}</td>
                  <td className="max-w-[260px] truncate px-5 py-3.5 text-sm font-medium">{client.name}</td>
                  <td className="flex items-center gap-1.5 px-5 py-3.5 text-sm text-muted-foreground">
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
            </tbody>
          </table>
          <div className="divide-y md:hidden">
            {filteredClients.map(client => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="block px-4 py-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{client.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{client.code}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${client.balance > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                    {formatCFA(client.balance)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{client.phone}</span>
                </div>
              </Link>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau Client</DialogTitle>
            <DialogDescription>Ajoutez un client avec ses coordonnées principales.</DialogDescription>
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
          <DialogFooter className="gap-2 sm:gap-0">
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
