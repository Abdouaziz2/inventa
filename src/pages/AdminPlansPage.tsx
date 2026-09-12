import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/plans';
import { getErrorMessage } from '@/lib/errors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type PlanDraft = {
  code: string;
  name: string;
  description: string;
  active: boolean;
  recommended: boolean;
  displayOrder: number;
  monthlyAmount: string;
  yearlyAmount: string;
};

type SettingsDraft = {
  trialEnabled: boolean;
  trialDurationDays: string;
  currency: string;
};

type CataloguePayload = {
  plans: Array<{
    code: string;
    name: string;
    description: string | null;
    active: boolean;
    recommended: boolean;
    displayOrder: number;
    prices: Partial<Record<'monthly' | 'yearly', { amount: number; currency: string } | undefined>>;
  }>;
  currency: string;
  trialEnabled: boolean;
  trialDurationDays: number;
};

async function invokeList(): Promise<{ catalogue: CataloguePayload; settings: SettingsDraft | null }> {
  const { data, error } = await supabase.functions.invoke('admin-subscription-plans', {
    body: { action: 'list' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error as string);
  return data as { catalogue: CataloguePayload; settings: SettingsDraft | null };
}

function isValidPlan(draft: PlanDraft): string | null {
  if (!/^[a-z][a-z0-9_]{1,31}$/u.test(draft.code)) return 'Code de plan invalide (minuscules, sans accents, britères).';
  if (draft.name.trim().length === 0) return 'Nom du plan requis.';
  for (const tag of ['monthlyAmount', 'yearlyAmount'] as const) {
    const value = Number(draft[tag]);
    if (!Number.isInteger(value) || value <= 0 || value > 100_000_000) {
      return 'Montants invalides (entiers entre 1 et 100 000 000).';
    }
  }
  return null;
}

export default function AdminPlansPage() {
  const [catalogue, setCatalogue] = useState<CataloguePayload | null>(null);
  const [settings, setSettings] = useState<SettingsDraft>({ trialEnabled: true, trialDurationDays: '14', currency: 'XOF' });
  const [plans, setPlans] = useState<PlanDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toDelete, setToDelete] = useState<PlanDraft | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await invokeList();
      setCatalogue(data.catalogue);
      setPlans(data.catalogue.plans.map((plan) => ({
        code: plan.code,
        name: plan.name,
        description: plan.description ?? '',
        active: plan.active,
        recommended: plan.recommended,
        displayOrder: plan.displayOrder,
        monthlyAmount: String(plan.prices.monthly?.amount ?? ''),
        yearlyAmount: String(plan.prices.yearly?.amount ?? ''),
      })));
      setSettings({
        trialEnabled: data.settings?.trialEnabled ?? data.catalogue.trialEnabled,
        trialDurationDays: String(data.settings?.trialDurationDays ?? data.catalogue.trialDurationDays),
        currency: data.settings?.currency ?? data.catalogue.currency,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de charger les plans.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updatePlan = (code: string, patch: Partial<PlanDraft>) => {
    setPlans((previous) => previous.map((plan) => (plan.code === code ? { ...plan, ...patch } : plan)));
  };

  const savePlan = async (draft: PlanDraft) => {
    const validation = isValidPlan(draft);
    if (validation) {
      toast.error(validation);
      return;
    }
    setSavingPlan(draft.code);
    try {
      const { data, error } = await supabase.functions.invoke('admin-subscription-plans', {
        body: {
          action: 'savePlan',
          plan: {
            code: draft.code,
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            active: draft.active,
            recommended: draft.recommended,
            displayOrder: draft.displayOrder,
            prices: [
              { frequency: 'monthly', amount: Number(draft.monthlyAmount), currency: catalogue?.currency ?? 'XOF', active: true },
              { frequency: 'yearly', amount: Number(draft.yearlyAmount), currency: catalogue?.currency ?? 'XOF', active: true },
            ],
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error as string);
      toast.success(`Plan ${draft.name} enregistré`);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Enregistrement impossible'));
    } finally {
      setSavingPlan(null);
    }
  };

  const saveSettings = async () => {
    const days = Number(settings.trialDurationDays);
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      toast.error('Durée d’essai invalide (1 à 90 jours).');
      return;
    }
    setSavingSettings(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-subscription-plans', {
        body: {
          action: 'saveSettings',
          settings: {
            trialEnabled: settings.trialEnabled,
            trialDurationDays: days,
            currency: 'XOF',
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error as string);
      toast.success('Réglages enregistrés');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Enregistrement impossible'));
    } finally {
      setSavingSettings(false);
    }
  };

  const addPlan = () => {
    setPlans((previous) => [
      ...previous,
      {
        code: `plan_${previous.length + 1}`,
        name: 'Nouveau plan',
        description: '',
        active: true,
        recommended: false,
        displayOrder: (previous.length + 1) * 10,
        monthlyAmount: '',
        yearlyAmount: '',
      },
    ]);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-subscription-plans', {
        body: { action: 'deletePlan', code: toDelete.code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error as string);
      toast.success('Plan supprimé');
      setToDelete(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Suppression impossible'));
    } finally {
      setDeleting(false);
    }
  };

  const savedCodes = useMemo(() => new Set(catalogue?.plans.map((plan) => plan.code) ?? []), [catalogue]);

  return (
    <div className="page-shell animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Plans et tarifs</h1>
          <p className="text-sm text-muted-foreground">
            Modifiez les offres d’abonnement, leurs tarifs et la durée de l’essai gratuit.
          </p>
        </div>
        <Button onClick={addPlan}>
          <Plus />
          Nouveau plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 />
            Réglages d’essai
          </CardTitle>
          <CardDescription>
            La durée d’essai s’applique aux nouveaux comptes. Le changement n’affecte pas les essais déjà en cours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="trial-enabled"
                checked={settings.trialEnabled}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, trialEnabled: checked }))}
              />
              <Label htmlFor="trial-enabled">Proposer un essai gratuit</Label>
            </div>
            <div className="flex items-end gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="trial-days">Durée de l’essai (jours)</Label>
                <Input
                  id="trial-days"
                  type="number"
                  min={1}
                  max={90}
                  className="w-36"
                  value={settings.trialDurationDays}
                  onChange={(event) => setSettings((s) => ({ ...s, trialDurationDays: event.target.value }))}
                />
              </div>
              <Button onClick={() => void saveSettings()} disabled={savingSettings}>
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save />}
                Enregistrer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">Chargement...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <Card key={`${plan.code}-${plans.indexOf(plan)}`} className={plan.recommended ? 'border-[#C89B3C]/60' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  {plan.name}
                  {plan.recommended && <Badge className="ml-2 bg-[#C89B3C] text-white">Populaire</Badge>}
                </CardTitle>
                <Badge variant={plan.active ? 'default' : 'outline'}>{plan.active ? 'Actif' : 'Masqué'}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                  <Label className="flex items-center text-muted-foreground">Code</Label>
                  <Input value={plan.code} readOnly className="bg-muted/40" />
                </div>
                <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                  <Label className="flex items-center text-muted-foreground">Nom</Label>
                  <Input value={plan.name} onChange={(event) => updatePlan(plan.code, { name: event.target.value })} />
                </div>
                <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                  <Label className="flex items-center text-muted-foreground">Description</Label>
                  <Input value={plan.description} onChange={(event) => updatePlan(plan.code, { description: event.target.value })} />
                </div>
                <div className="grid gap-2 sm:grid-cols-[140px_1fr] sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Tarif mensuel (FCFA)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={plan.monthlyAmount}
                      onChange={(event) => updatePlan(plan.code, { monthlyAmount: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Tarif annuel (FCFA)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={plan.yearlyAmount}
                      onChange={(event) => updatePlan(plan.code, { yearlyAmount: event.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                  <Label className="flex items-center text-muted-foreground">Ordre d’affichage</Label>
                  <Input
                    type="number"
                    value={plan.displayOrder}
                    onChange={(event) => updatePlan(plan.code, { displayOrder: Number(event.target.value) || 0 })}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={plan.active}
                      onCheckedChange={(checked) => updatePlan(plan.code, { active: checked })}
                    />
                    Plan actif
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={plan.recommended}
                      onCheckedChange={(checked) => updatePlan(plan.code, { recommended: checked })}
                    />
                    Recommandé
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => void savePlan(plan)}
                    disabled={savingPlan !== null}
                  >
                    {savingPlan === plan.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save />}
                    Enregistrer
                  </Button>
                  {savedCodes.has(plan.code) && (
                    <Button
                      variant="destructive"
                      className="text-muted-foreground"
                      disabled={deleting}
                      onClick={() => setToDelete(plan)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                {plan.monthlyAmount && (Number(plan.monthlyAmount) * 12 < Number(plan.yearlyAmount)) && (
                  <p className="text-xs text-[#C89B3C]">
                    Économie : {formatMoney(Number(plan.yearlyAmount) - Number(plan.monthlyAmount) * 12)} FCFA / an
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le plan {toDelete?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le plan {toDelete?.code} et ses tarifs seront supprimés. Les abonnés existants ne seront pas affectés,
              mais ce plan ne pourra plus être choisi. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? 'Suppression...' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}