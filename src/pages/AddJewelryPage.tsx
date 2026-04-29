import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  calculateSalePrice,
  jewelryMaterialOptions,
  useAddJewelry,
  type JewelryCategory,
  type JewelryMaterial,
} from '@/features/jewelry';
import { apiRequest } from '@/lib/api';
import { formatCFA } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const createJewelryCode = () =>
  `JW-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

const AddJewelryPage = () => {
  const navigate = useNavigate();
  const addJewelry = useAddJewelry();
  const [form, setForm] = useState({
    name: '',
    materialType: 'gold',
    category: 'other',
    quantity: '1',
    weight: '',
    pricePerGram: '',
    purchasePrice: '',
    photo: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez selectionner une image valide.');
      return;
    }

    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await apiRequest<{ url: string }>('/jewelry/photo', {
        method: 'POST',
        body: formData,
      });

      setForm((current) => ({ ...current, photo: response.url }));
      toast.success('Image importee');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Impossible d'importer l'image."));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const quantity = Math.max(0, Number(form.quantity || 0));

      await addJewelry.mutateAsync({
        code: createJewelryCode(),
        material_type: form.materialType as JewelryMaterial,
        name: form.name.trim(),
        quantity,
        weight: Number(form.weight || 0),
        price_per_gram: Number(form.pricePerGram || 0),
        purchase_price: Number(form.purchasePrice || 0),
        sale_price: calculateSalePrice(form.weight, form.pricePerGram),
        category: form.category as JewelryCategory,
        status: quantity > 0 ? 'available' : 'out_of_stock',
        photo: form.photo || null,
      });

      toast.success('Bijou ajoute avec succes');
      navigate('/jewelry');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/jewelry')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Ajouter un bijou</h1>
          <p className="text-sm text-muted-foreground">Formulaire simple avec type de matiere.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="space-y-2">
          <Label>Nom du bijou</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Bague solitaire"
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Matiere</Label>
            <Select value={form.materialType} onValueChange={(value) => setForm({ ...form, materialType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {jewelryMaterialOptions.map((material) => (
                  <SelectItem key={material.key} value={material.key}>
                    {material.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categorie</Label>
            <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Stock</Label>
            <Input
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{form.materialType === 'diamond' ? 'Poids (ct)' : 'Poids (g)'}</Label>
            <Input
              type="number"
              step="0.01"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              placeholder={form.materialType === 'diamond' ? '1.25' : '3.50'}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Prix d'achat</Label>
            <Input
              type="number"
              min="0"
              value={form.purchasePrice}
              onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
              placeholder="600000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Prix unitaire / gramme</Label>
            <Input
              type="number"
              min="0"
              value={form.pricePerGram}
              onChange={(e) => setForm({ ...form, pricePerGram: e.target.value })}
              placeholder="75000"
              required
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Prix total de vente</span>
            <span className="text-right font-semibold">
              {formatCFA(calculateSalePrice(form.weight, form.pricePerGram))}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Marge estimee</span>
            <span className="font-semibold">
              {formatCFA(calculateSalePrice(form.weight, form.pricePerGram) - Number(form.purchasePrice || 0))}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Image (optionnel)</Label>
          <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4 text-center transition hover:bg-muted/50">
              <ImagePlus className="mb-3 h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">{uploadingPhoto ? 'Import en cours...' : 'Importer une image'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={(e) => void handleImageFile(e.target.files?.[0])}
              />
            </label>

            <div className="flex min-h-32 items-center justify-center rounded-2xl border bg-background p-4">
              {form.photo ? (
                <img src={form.photo} alt="Apercu bijou" className="max-h-28 rounded-xl object-cover" />
              ) : (
                <p className="text-sm text-muted-foreground">Apercu image</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/jewelry')}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={addJewelry.isPending || uploadingPhoto}
            className="gold-gradient text-accent-foreground hover:opacity-90"
          >
            {addJewelry.isPending ? 'Enregistrement...' : uploadingPhoto ? 'Import image...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddJewelryPage;
