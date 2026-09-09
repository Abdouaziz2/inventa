import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/errors';
import { requestPasswordReset } from '@/services/auth';
import { publicAsset } from '@/lib/assets';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, 'Envoi impossible'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl sm:p-8">
        <img src={publicAsset('inventa-icon.svg')} alt="" className="mx-auto h-12 w-12 rounded-xl" />
        {sent ? (
          <div className="mt-6 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 text-2xl font-bold">Vérifiez votre email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Si ce compte existe, un lien de réinitialisation vient d’être envoyé.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-center text-2xl font-bold">Mot de passe oublié</h1>
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={loading} className="gold-gradient h-11 w-full font-semibold text-[#0A1628]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Envoyer le lien
              </Button>
            </form>
          </>
        )}
        <Button asChild variant="ghost" className="mt-5 w-full">
          <Link to="/login">
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </Button>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;
