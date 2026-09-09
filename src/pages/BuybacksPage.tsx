import { useState } from 'react';
import { FileCheck2, UserRound, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { useAddClient, useClients } from '@/features/clients';
import { useAddBuyback } from '@/features/operations';
import { buildBuybackReceipt } from '@/features/transactions';
import ReceiptModal, { type ReceiptData } from '@/components/ReceiptModal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ClientCombobox from '@/components/ClientCombobox';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import { formatCFA } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const materials = [
  { value: 'gold_18k', label: 'Or 18K' },
  { value: 'gold_21k', label: 'Or 21K' },
  { value: 'silver', label: 'Argent' },
  { value: 'diamond', label: 'Diamant' },
] as const;

const categories = [
  { value: 'rings', label: 'Bague' },
  { value: 'necklaces', label: 'Collier' },
  { value: 'bracelets', label: 'Bracelet' },
  { value: 'earrings', label: "Boucles d'oreilles" },
  { value: 'watches', label: 'Montre' },
  { value: 'other', label: 'Autre' },
] as const;

const BuybacksPage = () => {
  const [sellerMode, setSellerMode] = useState<'new' | 'existing'>('existing');
  const [clientId, setClientId] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState<(typeof materials)[number]['value']>('gold_18k');
  const [category, setCategory] = useState<(typeof categories)[number]['value']>('other');
  const [weight, setWeight] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [proofType, setProofType] = useState('Facture d’achat');
  const [proofReference, setProofReference] = useState('');
  const [proofOwnerName, setProofOwnerName] = useState('');
  const [ownershipVerified, setOwnershipVerified] = useState(false);
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const { data: clients = [] } = useClients();
  const addClient = useAddClient();
  const addBuyback = useAddBuyback();
  const client = clients.find((item) => item.id === clientId);
  const hasSeller = sellerMode === 'existing' ? !!client : !!sellerName.trim() && !!sellerPhone.trim();
  const canSubmit =
    hasSeller &&
    !!description.trim() &&
    Number(weight) > 0 &&
    Number(amount) > 0 &&
    !!proofReference.trim() &&
    !!proofOwnerName.trim() &&
    ownershipVerified;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const seller =
        sellerMode === 'existing'
          ? client
          : await addClient.mutateAsync({ name: sellerName.trim(), phone: sellerPhone.trim() });
      if (!seller) return;
      const buyback = await addBuyback.mutateAsync({
        client_id: seller.id,
        description,
        material_type: material,
        category,
        weight: Number(weight),
        purchase_amount: Number(amount),
        payment_method: paymentMethod,
        proof_type: proofType,
        proof_reference: proofReference.trim(),
        proof_owner_name: proofOwnerName.trim(),
        ownership_verified: ownershipVerified,
        notes,
      });
      setReceipt(buildBuybackReceipt(seller, buyback));
      toast.success('Retour enregistré comme sortie d’argent');
      setClientId('');
      setSellerName('');
      setSellerPhone('');
      setDescription('');
      setWeight('');
      setAmount('');
      setProofReference('');
      setProofOwnerName('');
      setOwnershipVerified(false);
      setNotes('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        eyebrow="Sortie d’argent"
        title="Retour"
        description="Enregistrez l’achat retour avec son justificatif. Cette opération ne crée aucun stock vendable."
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <SectionCard
            title="1. Vendeur"
            description="Recherchez d’abord la personne pour éviter les doublons."
            actions={<UserRound className="h-5 w-5 text-muted-foreground" />}
          >
            {sellerMode === 'existing' ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nom ou numéro de téléphone</Label>
                  <ClientCombobox clients={clients} value={clientId} onValueChange={setClientId} placeholder="Rechercher une personne..." />
                </div>
                <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setSellerMode('new')}>
                  Personne introuvable ? Créer un nouveau vendeur
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="seller-name">Nom complet du vendeur</Label>
                    <Input id="seller-name" value={sellerName} onChange={(event) => setSellerName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seller-phone">Téléphone</Label>
                    <Input id="seller-phone" value={sellerPhone} onChange={(event) => setSellerPhone(event.target.value)} />
                  </div>
                </div>
                <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setSellerMode('existing')}>
                  Revenir à la recherche
                </Button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="2. Bijou et montant" description="Saisissez les informations contrôlées au comptoir.">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buyback-description">Description du bijou</Label>
                <Input id="buyback-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Exemple : ancienne bague avec pierre rouge" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Matière</Label>
                  <Select value={material} onValueChange={(value) => setMaterial(value as typeof material)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{materials.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="buyback-weight">Poids contrôlé (g)</Label>
                  <Input id="buyback-weight" type="number" min="0.01" step="0.01" value={weight} onChange={(event) => setWeight(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyback-amount">Montant du retour (FCFA)</Label>
                  <Input id="buyback-amount" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="3. Justificatif de propriété" description="La facture et l’identité du vendeur doivent correspondre.">
            <div className="space-y-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <p className="text-sm font-medium">Le retour reste bloqué jusqu’à la confirmation du justificatif.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type de justificatif</Label>
                  <Select value={proofType} onValueChange={setProofType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Facture d’achat', 'Facture d’une autre bijouterie', 'Certificat ou acte de propriété'].map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proof-reference">Numéro ou référence</Label>
                  <Input id="proof-reference" value={proofReference} onChange={(event) => setProofReference(event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof-owner">Nom inscrit sur la facture</Label>
                <Input id="proof-owner" value={proofOwnerName} onChange={(event) => setProofOwnerName(event.target.value)} />
              </div>
              <label htmlFor="ownership-verified" className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 text-sm">
                <Checkbox id="ownership-verified" checked={ownershipVerified} onCheckedChange={(checked) => setOwnershipVerified(checked === true)} className="mt-0.5" />
                <span>J’ai vérifié la facture et confirmé que le bijou appartient bien au vendeur.</span>
              </label>
            </div>
            <details className="mt-4 rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-semibold">Ajouter des observations</summary>
              <Textarea className="mt-3" id="buyback-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="État du bijou, test effectué, défauts constatés..." />
            </details>
          </SectionCard>
        </div>

        <SectionCard className="xl:sticky xl:top-24" title="Récapitulatif" description="Vérifiez avant de confirmer.">
          <div className="space-y-5">
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">À payer au client</p>
              <p className="mt-2 text-2xl font-bold">{formatCFA(Number(amount) || 0)}</p>
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement au client</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Espèces', 'Mobile Money', 'Virement bancaire', 'Autre'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <p className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Vendeur</span><strong className="truncate">{client?.name || sellerName || 'Non renseigné'}</strong></p>
              <p className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Bijou</span><strong className="truncate">{description || 'Non renseigné'}</strong></p>
              <p className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Justificatif</span><strong>{ownershipVerified ? 'Vérifié' : 'À vérifier'}</strong></p>
            </div>
            <Button onClick={handleSubmit} disabled={!canSubmit || addBuyback.isPending || addClient.isPending} className="h-12 w-full gold-gradient font-bold text-accent-foreground">
              <WalletCards className="mr-2 h-5 w-5" />
              {addBuyback.isPending || addClient.isPending ? 'Enregistrement...' : 'Confirmer le retour'}
            </Button>
          </div>
        </SectionCard>
      </div>
      <ReceiptModal open={receipt !== null} onClose={() => setReceipt(null)} data={receipt} />
    </div>
  );
};

export default BuybacksPage;
