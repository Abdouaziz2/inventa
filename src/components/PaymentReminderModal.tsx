import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { buildWaveMerchantUrl } from '@/services/subscriptions';
import {
  buildSubscriptionReminderWhatsAppMessage,
  buildSubscriptionReminderWhatsAppUrl,
  normalizeWhatsAppPhone,
} from '@/lib/whatsapp';

export type PaymentReminderTarget = {
  id: string;
  email: string;
  fullName?: string;
  companyName?: string;
  phone?: string;
  expiresAt?: string | null;
  subscriptionStatus?: string | null;
  amount?: number | null;
};

type PaymentReminderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PaymentReminderTarget | null;
};

export default function PaymentReminderModal({
  open,
  onOpenChange,
  target,
}: PaymentReminderModalProps) {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(11500);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (target) {
      setPhone(target.phone || '');
      setAmount(target.amount && target.amount > 0 ? target.amount : 11500);
      setCopiedLink(false);
    }
  }, [target]);

  const { daysRemaining, isExpired, formattedDate } = useMemo(() => {
    if (!target) {
      return { daysRemaining: 0, isExpired: false, formattedDate: '' };
    }

    const expiresAt = target.expiresAt;
    let days = 0;
    let expired = false;

    if (expiresAt) {
      const diff = new Date(expiresAt).getTime() - Date.now();
      days = Math.ceil(diff / (24 * 60 * 60 * 1000));
      expired = days <= 0;
    } else if (
      target.subscriptionStatus === 'expired' ||
      target.subscriptionStatus === 'past_due'
    ) {
      expired = true;
    }

    const dateStr = expiresAt
      ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
          new Date(expiresAt),
        )
      : 'non définie';

    return {
      daysRemaining: days,
      isExpired: expired,
      formattedDate: dateStr,
    };
  }, [target]);

  const waveUrl = useMemo(() => buildWaveMerchantUrl(amount), [amount]);

  const whatsappMessage = useMemo(() => {
    if (!target) return '';
    return buildSubscriptionReminderWhatsAppMessage({
      clientName: target.fullName || target.companyName || 'Client',
      companyName: target.companyName || 'Inventa',
      planName: 'Business',
      amount,
      expiresAt: target.expiresAt ?? null,
      daysRemaining,
      paymentUrl: waveUrl,
    });
  }, [target, daysRemaining, amount, waveUrl]);

  const computedWhatsAppUrl = useMemo(() => {
    if (!target) return '';
    const rawPhone = phone.trim() || '772406874';
    const cleanPhone = normalizeWhatsAppPhone(rawPhone);
    if (!cleanPhone) return '';

    return buildSubscriptionReminderWhatsAppUrl(cleanPhone, {
      clientName: target.fullName || target.companyName || 'Client',
      companyName: target.companyName || 'Inventa',
      planName: 'Business',
      amount,
      expiresAt: target.expiresAt ?? null,
      daysRemaining,
      isExpired,
      expiresAtFormatted: formattedDate,
      paymentUrl: waveUrl,
    });
  }, [phone, target, amount, daysRemaining, isExpired, formattedDate, waveUrl]);

  if (!target) return null;

  const handleSendWhatsApp = () => {
    const rawPhone = phone.trim() || '772406874';
    if (!phone.trim()) {
      setPhone('772406874');
    }
    const cleanPhone = normalizeWhatsAppPhone(rawPhone);
    if (!cleanPhone) {
      toast.error('Numéro WhatsApp invalide.');
      return;
    }

    const url = buildSubscriptionReminderWhatsAppUrl(cleanPhone, {
      clientName: target.fullName || target.companyName || 'Client',
      companyName: target.companyName || 'Inventa',
      planName: 'Business',
      amount,
      expiresAt: target.expiresAt ?? null,
      daysRemaining,
      isExpired,
      expiresAtFormatted: formattedDate,
      paymentUrl: waveUrl,
    });

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Discussion WhatsApp ouverte');
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('access-requests', {
        body: {
          action: 'payment-reminder',
          user_id: target.id,
          amount,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.email_sent === false && data?.email_reason) {
        toast.warning(`Email non envoyé : ${data.email_reason}`);
      } else {
        toast.success(`Rappel envoyé par email à ${target.email}`);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Échec de l'envoi de l'email"));
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCopyWaveUrl = async () => {
    try {
      await navigator.clipboard.writeText(waveUrl);
      setCopiedLink(true);
      toast.success('Lien Wave copié dans le presse-papier');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Rappel de renouvellement</DialogTitle>
            <Badge variant={isExpired ? 'destructive' : 'secondary'}>
              {isExpired ? 'Expiré' : `Expire dans ${daysRemaining} j`}
            </Badge>
          </div>
          <DialogDescription>
            Envoyez un rappel de paiement avec le lien direct Wave à ce client par Email ou WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Client summary box */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">
                {target.fullName || 'Client sans nom'}
              </span>
              <span className="text-muted-foreground text-xs">{target.email}</span>
            </div>
            {target.companyName && (
              <p className="text-xs text-muted-foreground">
                Bijouterie : <span className="font-medium text-foreground">{target.companyName}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Échéance : <span className="font-medium text-foreground">{formattedDate}</span>
            </p>
          </div>

          {/* Amount and Phone Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reminder-amount">Montant à renouveler (FCFA)</Label>
              <Input
                id="reminder-amount"
                type="number"
                min={1000}
                step={500}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="reminder-phone">Numéro WhatsApp</Label>
                <button
                  type="button"
                  className="text-[11px] text-primary hover:underline font-medium"
                  onClick={() => setPhone('772406874')}
                >
                  Admin : 77 240 68 74
                </button>
              </div>
              <Input
                id="reminder-phone"
                placeholder="Ex: 77 240 68 74 ou +221772406874"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Wave Payment Link preview */}
          <div className="rounded-md border p-2.5 bg-background flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium">Lien de paiement Wave direct :</p>
              <p className="text-xs font-mono truncate text-primary">{waveUrl}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyWaveUrl}
              className="shrink-0 h-8 gap-1.5"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink ? 'Copié' : 'Copier'}
            </Button>
          </div>

          {/* WhatsApp message preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                Aperçu du message WhatsApp
              </Label>
              {!phone.trim() && (
                <span className="text-[11px] text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Renseignez le numéro pour envoyer
                </span>
              )}
            </div>
            <div className="rounded-md border bg-muted/20 p-2.5 text-xs font-sans whitespace-pre-wrap text-muted-foreground max-h-36 overflow-y-auto">
              {whatsappMessage}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>

          <div className="flex items-center gap-2">
            <a
              href={computedWhatsAppUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!phone.trim()) {
                  setPhone('772406874');
                }
                toast.success('Discussion WhatsApp ouverte');
              }}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-green-600 bg-background text-green-700 hover:bg-green-50 hover:text-green-800 dark:hover:bg-green-950/50 h-9 px-4 py-2 gap-1.5 cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-green-600" />
              Envoyer par WhatsApp
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>

            <Button
              type="button"
              onClick={handleSendEmail}
              disabled={isSendingEmail || !target.email}
              className="gap-1.5 bg-[#0A1628] hover:bg-[#152338] text-white"
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Envoyer par Email
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
