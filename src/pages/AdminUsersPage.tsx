import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Shield, ShieldOff, KeyRound, Trash2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeUsername } from '@/lib/auth';

interface ManagedUser {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  role: string;
  created_at: string;
}

const AdminUsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('seller');
  const [creating, setCreating] = useState(false);

  // Reset password dialog
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPasswordVal] = useState('');

  const callAdmin = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('admin-users', {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await callAdmin({ action: 'list_users' });
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error('Erreur chargement utilisateurs: ' + err.message);
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await callAdmin({
        action: 'create_user',
        username: newUsername,
        password: newPassword,
        full_name: newName,
        phone: newPhone,
        role: newRole,
      });
      toast.success('Compte créé. L’utilisateur peut se connecter immédiatement.');
      setShowCreate(false);
      setNewUsername(''); setNewName(''); setNewPhone(''); setNewPassword(''); setNewRole('seller');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreating(false);
  };

  const handleStatusChange = async (userId: string, status: string) => {
    setActionLoading(userId);
    try {
      await callAdmin({ action: 'update_status', user_id: userId, status });
      toast.success(`Statut mis à jour`);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(null);
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !resetPassword) return;
    setActionLoading(resetUserId);
    try {
      await callAdmin({ action: 'reset_password', user_id: resetUserId, new_password: resetPassword });
      toast.success('Mot de passe mis à jour');
      setResetUserId(null);
      setResetPasswordVal('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(null);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Supprimer cet utilisateur définitivement ?')) return;
    setActionLoading(userId);
    try {
      await callAdmin({ action: 'delete_user', user_id: userId });
      toast.success('Utilisateur supprimé');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(null);
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-success/10 text-success border-success/20',
      inactive: 'bg-muted text-muted-foreground border-border',
      suspended: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    const labels: Record<string, string> = {
      active: 'Actif',
      inactive: 'Inactif',
      suspended: 'Suspendu',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] || variants.inactive}`}>
        {labels[status] || status}
      </span>
    );
  };

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    seller: 'Vendeur',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-muted-foreground" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Créer, activer et gérer les accès utilisateurs</p>
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gold-gradient text-accent-foreground font-semibold">
              <UserPlus className="h-4 w-4 mr-2" /> Créer un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Nom d'utilisateur</Label>
                <Input
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  onBlur={() => setNewUsername((current) => normalizeUsername(current))}
                  required
                  minLength={3}
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="ex: vendeur1"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                <p className="text-xs text-muted-foreground">L'utilisateur se connectera directement avec ce nom d'utilisateur et ce mot de passe.</p>
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">Vendeur</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={creating} className="w-full gold-gradient text-accent-foreground font-semibold">
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création...</> : 'Créer l\'utilisateur'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reset password dialog */}
      <Dialog open={!!resetUserId} onOpenChange={(o) => { if (!o) { setResetUserId(null); setResetPasswordVal(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input type="password" value={resetPassword} onChange={e => setResetPasswordVal(e.target.value)} minLength={6} />
            </div>
            <Button onClick={handleResetPassword} disabled={!resetPassword || resetPassword.length < 6} className="w-full gold-gradient text-accent-foreground font-semibold">
              Enregistrer le mot de passe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Identifiant</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.username || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{roleLabel[u.role] || u.role}</Badge>
                    </TableCell>
                    <TableCell>{statusBadge(u.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.id !== user?.id && (
                          <>
                            {u.status === 'active' ? (
                              <Button variant="ghost" size="sm" onClick={() => handleStatusChange(u.id, 'inactive')} disabled={actionLoading === u.id} title="Désactiver">
                                <ShieldOff className="h-4 w-4 text-destructive" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleStatusChange(u.id, 'active')} disabled={actionLoading === u.id} title="Activer">
                                <Shield className="h-4 w-4 text-success" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setResetUserId(u.id)} title="Réinitialiser MDP">
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} disabled={actionLoading === u.id} title="Supprimer">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsersPage;
