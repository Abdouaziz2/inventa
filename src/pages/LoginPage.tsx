import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Diamond } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const LoginPage = () => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(code, password)) {
      navigate('/');
    } else {
      setError('Code utilisateur invalide');
    }
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
            Jewel<span className="text-gold">Stock</span>
          </h1>
          <p className="text-primary-foreground/60 text-lg max-w-md">
            Gérez votre stock de bijoux, vos ventes et vos clients avec élégance et précision.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-4">
            <Diamond className="h-8 w-8 text-gold" />
            <span className="text-2xl font-bold">Jewel<span className="gold-text">Stock</span></span>
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Connexion</h2>
            <p className="text-muted-foreground text-sm">Entrez votre code utilisateur pour accéder au système</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code Utilisateur</Label>
              <Input
                id="code"
                placeholder="Ex: ADM001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-11"
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
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full h-11 gold-gradient text-accent-foreground font-semibold hover:opacity-90 transition-opacity">
              Se connecter
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Codes démo: ADM001, VND001, MGR001 (tout mot de passe)
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
