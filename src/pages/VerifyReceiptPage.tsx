import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { formatCFA } from '@/lib/format';
import {
  decodeReceiptQrPayload,
  verifyReceiptToken,
  type ReceiptQrPayload,
  type VerifiedDocument,
} from '@/lib/receiptQr';
import { publicAsset } from '@/lib/assets';

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const VerifyReceiptPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const legacyPayload = decodeReceiptQrPayload(searchParams.get('document') ?? '');
  const [verifiedDocument, setVerifiedDocument] = useState<VerifiedDocument | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    verifyReceiptToken(token)
      .then((document) => {
        if (!active) return;
        setVerifiedDocument(document);
        if (!document) setError('Ce document est inconnu ou le lien a expiré.');
      })
      .catch(() => {
        if (active) setError('La vérification est momentanément indisponible.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const payload: ReceiptQrPayload | VerifiedDocument | null = verifiedDocument ?? legacyPayload;
  const isVerified = !!verifiedDocument;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5f7] p-4 text-[#0A1628]">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-xl">
        <header className="flex items-center gap-3 border-b bg-[#0A1628] px-5 py-4 text-white">
          <img src={publicAsset('inventa-icon.png')} alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <p className="font-semibold">Inventa</p>
            <p className="text-xs text-white/60">Consultation de document</p>
          </div>
        </header>

        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#C9972A]" />
            <p className="mt-3 text-sm text-slate-500">Vérification du document...</p>
          </div>
        ) : payload ? (
          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isVerified ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-700'}`}>
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold">{payload.documentType}</h1>
                <p className="mt-1 font-mono text-sm text-slate-500">{payload.documentNumber}</p>
                <p className={`mt-2 text-xs font-semibold ${isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isVerified ? 'Document enregistré et vérifié' : 'Ancien QR : contenu consultatif'}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border">
              {[
                ['Établissement', payload.businessName],
                ['Client', payload.clientName],
                ['Date', formatDate(payload.date)],
                ['Montant', formatCFA(payload.amount)],
                ['Règlement', payload.paymentMethod],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className={`flex justify-between gap-4 px-4 py-3 text-sm ${index > 0 ? 'border-t' : ''}`}
                >
                  <span className="text-slate-500">{label}</span>
                  <span className="text-right font-semibold">{value}</span>
                </div>
              ))}
            </div>

            <p className="mt-5 rounded-xl bg-[#C9972A]/10 p-4 text-sm leading-relaxed text-slate-600">
              {isVerified
                ? 'Ces informations proviennent du registre Inventa de la bijouterie.'
                : 'Ce format ancien peut être lu, mais son contenu n’est pas vérifié par le registre.'}
            </p>
          </div>
        ) : (
          <div className="p-7 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-bold">Document illisible</h1>
            <p className="mt-2 text-sm text-slate-500">
              {error || 'Ce QR code est incomplet ou son contenu a été modifié.'}
            </p>
          </div>
        )}

        <footer className="flex items-center justify-center gap-2 border-t px-5 py-4 text-xs text-slate-400">
          <FileText className="h-4 w-4" />
          Document généré avec Inventa
        </footer>
      </section>
    </main>
  );
};

export default VerifyReceiptPage;
