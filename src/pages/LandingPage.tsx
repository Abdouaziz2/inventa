import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  Download,
  Gem,
  Globe2,
  Loader2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { publicAsset } from '@/lib/assets';
import { getErrorMessage } from '@/lib/errors';
import { getDesktopDownloadUrl, requestAccess } from '@/services/access';

const benefits = [
  {
    icon: Boxes,
    title: 'Un stock toujours clair',
    text: 'Suivez chaque produit, sa disponibilité et les mouvements de stock sans tableau compliqué.',
  },
  {
    icon: ReceiptText,
    title: 'Des ventes bien tracées',
    text: 'Encaissez rapidement et retrouvez les factures, reçus et opérations depuis un seul espace.',
  },
  {
    icon: Users,
    title: 'Une relation client simple',
    text: 'Centralisez les clients, commandes, réservations et soldes avec une interface facile à utiliser.',
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, hasAccess, logout } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    website: '',
  });

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await requestAccess(form);
      setSubmittedEmail(form.email.trim().toLowerCase());
      toast.success('Votre demande a bien été enregistrée.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Impossible d’envoyer la demande'));
    } finally {
      setSubmitting(false);
    }
  };

  const downloadDesktop = async () => {
    if (!hasAccess) return;
    setDownloading(true);
    try {
      const url = await getDesktopDownloadUrl();
      window.location.assign(url);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Le téléchargement est momentanément indisponible'));
    } finally {
      setDownloading(false);
    }
  };

  const requestSection = () => {
    document.getElementById('demande-acces')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#0A1628]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Accueil Inventa">
            <img src={publicAsset('inventa-icon.svg')} alt="" className="h-9 w-9 rounded-lg" />
            <div>
              <p className="text-lg font-bold leading-none">Inventa</p>
              <p className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:block">
                Inventory Intelligence
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => void logout()}>
                  Se déconnecter
                </Button>
                <Button onClick={() => navigate('/dashboard')} className="bg-[#0A1628] text-white hover:bg-[#13243d]">
                  Mon espace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="px-2 text-xs sm:px-4 sm:text-sm">
                  <Link to="/login">
                    <span className="sm:hidden">Connexion</span>
                    <span className="hidden sm:inline">Se connecter</span>
                  </Link>
                </Button>
                <Button onClick={requestSection} className="gold-gradient px-3 text-xs font-semibold text-[#0A1628] sm:px-4 sm:text-sm">
                  <span className="sm:hidden">Demander</span>
                  <span className="hidden sm:inline">Demander un accès</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#0A1628] text-white">
          <div className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#C9972A]/15 blur-3xl" />
          <div className="absolute -bottom-64 left-1/4 h-[32rem] w-[32rem] rounded-full bg-[#1B3A6B]/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F5D97A]/25 bg-white/5 px-4 py-2 text-sm text-[#F5D97A]">
                <Gem className="h-4 w-4" />
                Conçu pour les bijouteries
              </div>
              <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
                Gérez votre boutique avec plus de
                <span className="text-[#F5D97A]"> clarté.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Stock, ventes, clients, commandes et documents réunis dans une application pensée pour la bijouterie.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={hasAccess ? () => navigate('/dashboard') : requestSection}
                  className="gold-gradient h-12 px-6 font-bold text-[#0A1628]"
                >
                  {hasAccess ? 'Ouvrir Inventa' : 'Demander mon accès'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/login">J’ai déjà un compte</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                {['Données sécurisées', 'Web et Windows', 'Assistance à l’activation'].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#F5D97A]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#C9972A]/30 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white p-3 shadow-2xl shadow-black/30">
                <div className="rounded-[1.15rem] bg-[#f5f6f8] p-4 text-[#0A1628] sm:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={publicAsset('inventa-icon.svg')} alt="" className="h-9 w-9 rounded-lg" />
                      <div>
                        <p className="font-bold">Tableau de bord</p>
                        <p className="text-xs text-slate-500">Vue d’ensemble de votre activité</p>
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-[#0A1628]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Ventes du jour', '2 505 000 FCFA'],
                      ['Bijoux disponibles', '248'],
                      ['Clients actifs', '186'],
                      ['Commandes en cours', '12'],
                    ].map(([label, value], index) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className={`mb-4 h-8 w-8 rounded-lg ${index === 0 ? 'bg-[#F5D97A]' : 'bg-[#0A1628]/8'}`} />
                        <p className="text-[11px] text-slate-500">{label}</p>
                        <p className="mt-1 text-sm font-bold sm:text-base">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold">Activité récente</p>
                      <span className="text-xs text-[#C9972A]">Voir tout</span>
                    </div>
                    {[72, 48, 61].map((width, index) => (
                      <div key={width} className="mb-3 flex items-center gap-3 last:mb-0">
                        <div className="h-8 w-8 rounded-full bg-slate-100" />
                        <div className="flex-1">
                          <div className="h-2 rounded bg-slate-200" style={{ width: `${width}%` }} />
                          <div className="mt-2 h-1.5 w-1/3 rounded bg-slate-100" />
                        </div>
                        <span className="text-xs font-semibold">{index + 1} pièce</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#C9972A]">L’essentiel, sans surcharge</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Tout ce qu’il faut pour bien gérer</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Des écrans lisibles, des actions rapides et les informations importantes toujours à portée de main.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A1628] text-[#F5D97A]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="demande-acces" className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-start lg:px-8">
            <div className="lg:sticky lg:top-24">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#C9972A]">Accès contrôlé</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                Commencez avec un compte validé
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-slate-600">
                Envoyez votre demande. Après vérification, l’administrateur active votre compte et vous donne accès aux versions Web et Desktop.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  ['1', 'Envoyez votre demande', 'Renseignez vos coordonnées et votre bijouterie.'],
                  ['2', 'Validation administrative', 'Votre demande est vérifiée avant activation.'],
                  ['3', 'Accédez à Inventa', 'Utilisez la version Web ou téléchargez la version Windows.'],
                ].map(([number, title, text]) => (
                  <div key={number} className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A1628] text-sm font-bold text-[#F5D97A]">
                      {number}
                    </div>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-[#f8f9fb] p-5 shadow-sm sm:p-8">
              {isAuthenticated ? (
                <div className="space-y-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A1628] text-[#F5D97A]">
                    {hasAccess ? <BadgeCheck className="h-7 w-7" /> : <LockKeyhole className="h-7 w-7" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {hasAccess ? 'Votre accès est activé' : 'Votre demande est en attente'}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {hasAccess
                        ? `Le compte ${user?.email} peut utiliser Inventa sur le Web et sur Windows.`
                        : `Le compte ${user?.email} sera utilisable dès sa validation par l’administrateur.`}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={!hasAccess}
                      onClick={() => navigate('/dashboard')}
                      className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#C9972A] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <Globe2 className="h-6 w-6 text-[#C9972A]" />
                      <p className="mt-4 font-bold">Version Web</p>
                      <p className="mt-1 text-sm text-slate-500">Ouvrir dans votre navigateur</p>
                    </button>
                    <button
                      type="button"
                      disabled={!hasAccess || downloading}
                      onClick={() => void downloadDesktop()}
                      className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#C9972A] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {downloading ? <Loader2 className="h-6 w-6 animate-spin text-[#C9972A]" /> : <Download className="h-6 w-6 text-[#C9972A]" />}
                      <p className="mt-4 font-bold">Version Desktop</p>
                      <p className="mt-1 text-sm text-slate-500">Télécharger pour Windows</p>
                    </button>
                  </div>
                </div>
              ) : submittedEmail ? (
                <div className="py-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-2xl font-bold">Demande envoyée</h3>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                    Votre demande pour <strong>{submittedEmail}</strong> est enregistrée. Confirmez votre adresse si vous recevez un email, puis attendez la validation de l’administrateur.
                  </p>
                  <Button asChild className="mt-7 bg-[#0A1628] text-white hover:bg-[#13243d]">
                    <Link to="/login">Aller à la connexion</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={submitRequest} className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-bold">Demander un accès</h3>
                    <p className="mt-2 text-sm text-slate-600">La création du compte est soumise à validation.</p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nom complet</Label>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                        placeholder="Votre nom"
                        minLength={2}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nom de la boutique</Label>
                      <Input
                        id="companyName"
                        value={form.companyName}
                        onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                        placeholder="Ex. Boutique Centrale"
                        minLength={2}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requestEmail">Adresse email</Label>
                    <Input
                      id="requestEmail"
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                      placeholder="nom@exemple.com"
                      autoCapitalize="none"
                      required
                    />
                  </div>
                  <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                    <Label htmlFor="requestWebsite">Site internet</Label>
                    <Input
                      id="requestWebsite"
                      value={form.website}
                      onChange={(event) => setForm({ ...form, website: event.target.value })}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requestPassword">Mot de passe</Label>
                    <Input
                      id="requestPassword"
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      placeholder="8 caractères minimum"
                      minLength={8}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="gold-gradient h-11 w-full font-bold text-[#0A1628]">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Envoyer ma demande
                  </Button>
                  <p className="text-center text-xs leading-5 text-slate-500">
                    En envoyant la demande, vous acceptez que vos informations soient utilisées pour créer et valider votre accès Inventa.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#07101e] text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={publicAsset('inventa-icon.svg')} alt="" className="h-8 w-8 rounded-lg" />
            <span className="font-semibold text-white">Inventa</span>
          </div>
          <p className="text-sm">Gestion professionnelle de boutique, sur le Web et Windows.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
