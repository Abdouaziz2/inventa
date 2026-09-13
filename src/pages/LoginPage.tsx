import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { publicAsset } from '@/lib/assets';
import { demoCredentials } from '@/lib/demo';
import { getCheckoutIntent } from '@/lib/checkoutIntent';
import { usePlanCatalogue } from '@/hooks/usePlans';
import {
  computeCatalogueAmount,
  fallbackCatalogue,
  formatMoney,
  planDisplayName,
} from '@/lib/plans';
import type { PlanFrequency, WavePlanId } from '@/lib/wave';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const { data: catalogue } = usePlanCatalogue();

  const intent = getCheckoutIntent();
  const paramPlan = (searchParams.get('plan') as WavePlanId | null) || intent?.plan;
  const paramFrequency =
    (searchParams.get('frequency') as PlanFrequency | null) || intent?.frequency || 'monthly';
  const isTrial = searchParams.get('trial') === 'true' || intent?.isTrial;

  const initialMode =
    searchParams.get('mode') === 'register' || searchParams.get('trial') === 'true'
      ? 'register'
      : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  const effectiveCatalogue = catalogue ?? fallbackCatalogue();
  const selectedPlanName = paramPlan
    ? planDisplayName(effectiveCatalogue, paramPlan)
    : null;

  let selectedPlanAmount = 0;
  if (paramPlan) {
    try {
      selectedPlanAmount = computeCatalogueAmount(effectiveCatalogue, paramPlan, paramFrequency);
    } catch {
      selectedPlanAmount = 0;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (mode === 'login') {
      const result = await login(identifier, password);
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }
      if (paramPlan) {
        navigate(`/subscription?plan=${paramPlan}&frequency=${paramFrequency}`);
      } else {
        navigate('/dashboard');
      }
    } else {
      const result = await signup({
        email: identifier,
        password,
        fullName,
        companyName,
      });

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.requiresEmailConfirmation) {
        setEmailConfirmationSent(true);
        setIsLoading(false);
        return;
      }

      // Inscription réussie avec session active
      if (paramPlan) {
        navigate(`/subscription?plan=${paramPlan}&frequency=${paramFrequency}`);
      } else {
        navigate('/dashboard');
      }
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
          <div className="pt-4 flex items-center justify-center gap-6 text-sm text-primary-foreground/80">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#F5D97A]" /> 14 jours d’essai gratuit
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#F5D97A]" /> Sans engagement
            </span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-4 sm:p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-2">
            <img src={publicAsset('inventa-icon.png')} alt="" className="h-10 w-10 rounded-lg" />
            <span className="text-2xl font-semibold text-[#0A1628] dark:text-white">Inventa</span>
          </div>

          {/* Bandeau d'intention contextuelle (Plan ou Essai) */}
          {selectedPlanName && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-left shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                <Sparkles className="h-3.5 w-3.5 text-[#C89B3C]" />
                Offre sélectionnée
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Plan {selectedPlanName}
                {selectedPlanAmount > 0 ? ` · ${formatMoney(selectedPlanAmount)} FCFA` : ''} (
                {paramFrequency === 'yearly' ? 'Annuel' : 'Mensuel'})
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {mode === 'login'
                  ? 'Connectez-vous à votre compte pour finaliser votre abonnement.'
                  : 'Créez votre compte pour activer vos 14 jours d’essai ou payer cette offre.'}
              </p>
            </div>
          )}

          {!selectedPlanName && isTrial && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-left shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Essai gratuit 14 jours
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Accès complet offert sans carte bancaire
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Créez votre compte en 30 secondes pour commencer immédiatement.
              </p>
            </div>
          )}

          {/* Bascule Onglets Connexion / Créer un compte */}
          <div className="flex rounded-xl bg-muted/70 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 rounded-lg py-2 transition-all duration-150 ${
                mode === 'login'
                  ? 'bg-background text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 rounded-lg py-2 transition-all duration-150 ${
                mode === 'register'
                  ? 'bg-background text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Créer un compte
            </button>
          </div>

          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === 'login' ? 'Connexion à votre espace' : 'Créer votre compte'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === 'login'
                ? 'Renseignez vos identifiants pour accéder à Inventa.'
                : '14 jours d’essai gratuit inclus. Aucun paiement requis.'}
            </p>
          </div>

          {emailConfirmationSent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
              <MailCheck className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-emerald-900 text-lg">Vérifiez vos emails</h3>
              <p className="text-sm text-emerald-700">
                Un email de confirmation a été envoyé à <strong className="font-semibold">{identifier}</strong>.
                Cliquez sur le lien reçu pour valider votre compte.
              </p>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => {
                  setEmailConfirmationSent(false);
                  setMode('login');
                }}
              >
                Retour à la connexion
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Nom complet</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Moussa Diop"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Nom de votre bijouterie / entreprise</Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Bijouterie Keur Gui"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="identifier">Adresse email</Label>
                <Input
                  id="identifier"
                  type="email"
                  placeholder="contact@bijouterie.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-11"
                  required
                  autoFocus={mode === 'login'}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">Mot de passe</Label>
                  {mode === 'login' && (
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Mot de passe oublié ?
                    </Link>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  </div>
                  {mode === 'register' && error.includes('existe déjà') && (
                    <div className="pl-6">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMode('login');
                          setError('');
                        }}
                        className="h-8 text-xs font-semibold border-destructive/30 hover:bg-destructive/10"
                      >
                        Se connecter avec ce compte
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 gold-gradient text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {mode === 'login' ? 'Connexion en cours...' : 'Création du compte...'}
                  </>
                ) : mode === 'login' ? (
                  'Se connecter'
                ) : (
                  'Créer mon compte et démarrer'
                )}
              </Button>
            </form>
          )}

          {mode === 'login' && import.meta.env.DEV ? (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Comptes démo locaux
              </p>
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
            {mode === 'login' ? (
              <>
                Nouveau sur Inventa ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  Créer un compte (14 jours gratuits)
                </button>
              </>
            ) : (
              <>
                Vous avez déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  Se connecter
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
