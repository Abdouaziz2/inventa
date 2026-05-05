import { useState } from 'react';
import { Diamond, Loader2, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(identifier, password);
    if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-primary lg:flex lg:w-1/2">
        <div className="absolute inset-x-0 top-0 h-1 gold-gradient" />
        <div className="relative space-y-6 px-12 text-center">
          <Diamond className="h-16 w-16 text-gold mx-auto" />
          <h1 className="text-4xl font-display font-bold text-primary-foreground">
            Gestion <span className="text-gold">Bijouterie</span>
          </h1>
          <p className="text-primary-foreground/60 text-lg max-w-md">
            Plateforme professionnelle de gestion de bijouterie. Sécurisée, rapide et multi-entreprises.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-4 sm:p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-4">
            <Diamond className="h-8 w-8 text-gold" />
            <span className="text-2xl font-bold">Gestion <span className="gold-text">Bijouterie</span></span>
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Connexion</h2>
            <p className="text-muted-foreground text-sm">Connectez-vous avec votre compte Supabase</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email</Label>
              <Input
                id="identifier"
                type="email"
                placeholder="email@exemple.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-11"
                required
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 gold-gradient text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connexion...</>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Les comptes sont créés par l'administrateur dans Supabase.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
