import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Download,
  Globe2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/errors';
import { getDesktopDownloadUrl, requestAccess } from '@/services/access';

interface AccessRequestSectionProps {
  onGoToLogin?: () => void;
  onOpenApp?: () => void;
}

const AccessRequestSection = ({ onGoToLogin, onOpenApp }: AccessRequestSectionProps) => {
  const { user, isAuthenticated, hasAccess } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (window.location.hash === '#demande-acces') {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const downloadDesktop = async () => {
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

  const renderAppIcon = () => (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A1628] text-[#F5D97A]">
      {downloading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Download className="h-5 w-5" />
      )}
    </div>
  );

  const renderDesktopCard = (className = '') => (
    <button
      type="button"
      disabled={downloading}
      onClick={() => void downloadDesktop()}
      className={`rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#C9972A] disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
    >
      {renderAppIcon()}
      <p className="mt-4 font-bold">Télécharger la version Desktop</p>
      <p className="mt-1 text-sm text-slate-500">Installateur Windows · Inventa-Setup 1.0.1</p>
    </button>
  );

  return (
    <section id="demande-acces" className="scroll-mt-24 border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-[80px] sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start lg:py-[110px]">
        <div className="lg:sticky lg:top-24">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#C9972A]">Accès contrôlé</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Commencez avec un compte validé</h2>
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
          <div className="mt-10">
            {renderDesktopCard()}
          </div>
        </div>

        <div ref={cardRef} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-[#f8f9fb] p-5 shadow-sm sm:p-8">
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
                  onClick={() => onOpenApp?.()}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#C9972A] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Globe2 className="h-6 w-6 text-[#C9972A]" />
                  <p className="mt-4 font-bold">Version Web</p>
                  <p className="mt-1 text-sm text-slate-500">Ouvrir dans votre navigateur</p>
                </button>
                {renderDesktopCard()}
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
                <button type="button" onClick={onGoToLogin}>Aller à la connexion</button>
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
  );
};

export default AccessRequestSection;