import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAddJewelry } from '@/hooks/useDatabase';

const AddJewelryPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', weight: '', purchasePrice: '', salePrice: '', category: '' });
  const addJewelry = useAddJewelry();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addJewelry.mutateAsync({
        name: form.name,
        weight: parseFloat(form.weight) || 0,
        purchase_price: parseInt(form.purchasePrice) || 0,
        sale_price: parseInt(form.salePrice) || 0,
        category: (form.category || 'other') as any,
      });
      toast.success('Bijou ajouté avec succès');
      navigate('/jewelry');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/jewelry')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold tracking-tight">Ajouter un Bijou</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 card-shadow space-y-5">
        <div className="space-y-2">
          <Label>Nom du bijou</Label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Bague Solitaire Diamant" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Poids (grammes)</Label>
            <Input type="number" step="0.1" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="3.5" required />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rings">Bagues</SelectItem>
                <SelectItem value="necklaces">Colliers</SelectItem>
                <SelectItem value="bracelets">Bracelets</SelectItem>
                <SelectItem value="earrings">Boucles d'oreilles</SelectItem>
                <SelectItem value="watches">Montres</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Prix d'achat (FCFA)</Label>
            <Input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} placeholder="600000" required />
          </div>
          <div className="space-y-2">
            <Label>Prix de vente (FCFA)</Label>
            <Input type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value })} placeholder="925000" required />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Photo</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Cliquer ou glisser une photo</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/jewelry')}>Annuler</Button>
          <Button type="submit" disabled={addJewelry.isPending} className="gold-gradient text-accent-foreground hover:opacity-90">
            {addJewelry.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddJewelryPage;
