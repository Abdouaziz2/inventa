import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Diamond, Loader2, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const ChangePasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { changePassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    const result = await changePassword(password);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Mot de passe modifié avec succès');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center gap-2.5 justify-center mb-4">
          <Diamond className="h-8 w-8 text-gold" />
          <span className="text-2xl font-bold">Jewel<span className="gold-text">Stock</span></span>
        </div>

        <div className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-3">
            <Lock className="h-6 w-6 text-warning" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Changement de mot de passe</h2>
          <p className="text-muted-foreground text-sm">
            Vous devez définir un nouveau mot de passe pour continuer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 gold-gradient text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</>
            ) : (
              'Définir le mot de passe'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
