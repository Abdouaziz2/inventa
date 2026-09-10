import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { publicAsset } from '@/lib/assets';
import { demoCredentials } from '@/lib/demo';

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
          <img src={publicAsset('inventa-logo.png')} alt="Inventa" className="mx-auto w-full max-w-md" />
          <p className="text-primary-foreground/60 text-lg max-w-md">
            La plateforme professionnelle pour piloter vos stocks, clients et ventes.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-4 sm:p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-4">
            <img src={publicAsset('inventa-icon.png')} alt="" className="h-10 w-10 rounded-lg" />
            <span className="text-2xl font-semibold text-[#0A1628] dark:text-white">Inventa</span>
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Connexion</h2>
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
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Mot de passe</Label>
                <Link to="/forgot-password" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                  Mot de passe oublié ?
                </Link>
              </div>
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

          {import.meta.env.DEV ? (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Comptes démo locaux</p>
              <div className="space-y-2">
                {demoCredentials.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => {
                      setIdentifier(demo.email);
                      setPassword(demo.password);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-xs hover:border-[#C9972A]"
                  >
                    <span className="font-semibold">{demo.company}</span>
                    <span className="text-muted-foreground">{demo.email}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="text-xs text-center text-muted-foreground">
            Besoin d&apos;un accès ?{' '}
            <a href={window.location.protocol === 'file:' ? '#' : '/#demande-acces'} className="font-semibold text-foreground underline-offset-4 hover:underline">
              Envoyer une demande
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
