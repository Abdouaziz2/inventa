import { useState } from 'react';
import { Diamond, Loader2, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full gold-gradient blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full gold-gradient blur-3xl" />
        </div>
        <div className="relative text-center space-y-6 px-12">
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
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-4">
            <Diamond className="h-8 w-8 text-gold" />
            <span className="text-2xl font-bold">Gestion <span className="gold-text">Bijouterie</span></span>
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Connexion</h2>
            <p className="text-muted-foreground text-sm">Entrez vos identifiants pour accéder au système</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
                autoFocus
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
            Accès réservé aux utilisateurs autorisés. Contactez votre administrateur pour obtenir un accès.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
