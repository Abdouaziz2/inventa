import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown,
  CirclePlus,
  CircleMinus,
  ImagePlus,
  MoreHorizontal,
  Package2,
  PencilLine,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { formatCFA } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { uploadJewelryImage } from '@/services/storage';
import {
  filterJewelry,
  calculateSalePrice,
  formatJewelryMaterial,
  getJewelryTotalPrice,
  jewelryMaterialOptions,
  jewelrySortOptions,
  jewelryStatusOptions,
  sortJewelry,
  useJewelry,
  useAdjustJewelryStock,
  useUpdateJewelry,
  useUpdateJewelryStatus,
  type Jewelry,
  type JewelrySortKey,
  type JewelryStatus,
  type JewelryStatusFilter,
} from '@/features/jewelry';

const PAGE_SIZE = 10;

const emptyEditor = {
  id: '',
  code: '',
  material_type: 'gold_18k',
  name: '',
  quantity: '0',
  weight: '0',
  category: 'other',
  purchase_price: '0',
  sale_price: '0',
  price_per_gram: '0',
  status: 'available',
  photo: '',
};

const JewelryPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JewelryStatusFilter>('all');
  const [sortKey, setSortKey] = useState<JewelrySortKey>('recent');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<typeof emptyEditor | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState<{
    item: Jewelry;
    direction: 'add' | 'remove';
    quantity: string;
    reason: string;
  } | null>(null);

  const { data: jewelry = [], isLoading } = useJewelry();
  const updateJewelry = useUpdateJewelry();
  const updateJewelryStatus = useUpdateJewelryStatus();
  const adjustJewelryStock = useAdjustJewelryStock();

  const filteredJewelry = useMemo(
    () => sortJewelry(filterJewelry(search, statusFilter)(jewelry), sortKey),
    [jewelry, search, sortKey, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredJewelry.length / PAGE_SIZE));
  const paginatedJewelry = filteredJewelry.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const lowStockCount = jewelry.filter((item) => item.quantity > 0 && item.quantity <= 3).length;
  const outOfStockCount = jewelry.filter((item) => item.quantity <= 0).length;

  useEffect(() => {
    setPage(1);
  }, [search, sortKey, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!editing) setUploadingPhoto(false);
  }, [editing]);

  const openEditor = (item: Jewelry) => {
    setEditing({
      id: item.id,
      code: item.code,
      material_type: item.material_type,
      name: item.name,
      quantity: String(item.quantity),
      weight: String(item.weight),
      category: item.category,
      purchase_price: String(item.purchase_price),
      sale_price: String(item.sale_price),
      price_per_gram: String(item.price_per_gram),
      status: item.status,
      photo: item.photo || '',
    });
  };

  const handleQuickStatus = async (item: Jewelry, status: JewelryStatus, quantity = item.quantity) => {
    try {
      await updateJewelryStatus.mutateAsync({ id: item.id, status, quantity });
      toast.success('Inventaire mis a jour');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleStockAdjustment = async () => {
    if (!stockAdjustment) return;
    const quantity = Number(stockAdjustment.quantity);
    const delta = stockAdjustment.direction === 'add' ? quantity : -quantity;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error('La quantité doit être un entier supérieur à zéro.');
      return;
    }

    if (stockAdjustment.direction === 'remove' && quantity > stockAdjustment.item.quantity) {
      toast.error('La sortie ne peut pas dépasser le stock disponible.');
      return;
    }

    if (!stockAdjustment.reason.trim()) {
      toast.error('Indiquez un motif pour conserver une trace du mouvement.');
      return;
    }

    try {
      const nextQuantity = await adjustJewelryStock.mutateAsync({
        id: stockAdjustment.item.id,
        delta,
        reason: stockAdjustment.reason.trim(),
      });
      toast.success(`Stock mis a jour: ${nextQuantity}`);
      setStockAdjustment(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;

    const salePrice = calculateSalePrice(editing.weight, editing.price_per_gram);

    try {
      await updateJewelry.mutateAsync({
        id: editing.id,
        code: editing.code.trim(),
        material_type: editing.material_type as Jewelry['material_type'],
        name: editing.name.trim(),
        quantity: Math.max(0, Number(editing.quantity || 0)),
        weight: Number(editing.weight || 0),
        category: editing.category as Jewelry['category'],
        purchase_price: Number(editing.purchase_price || 0),
        sale_price: salePrice,
        price_per_gram: Number(editing.price_per_gram || 0),
        status: editing.status as JewelryStatus,
        photo: editing.photo || null,
      });
      toast.success('Reference mise a jour');
      setEditing(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleEditImageFile = async (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez selectionner une image valide.');
      return;
    }

    setUploadingPhoto(true);

    try {
      if (!user?.companyId) throw new Error('Entreprise introuvable');
      const upload = await uploadJewelryImage(user.companyId, user.id, file);
      setEditing((current) => (current ? { ...current, photo: upload.url } : current));
      toast.success('Image importee');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Impossible d'importer l'image."));
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">Inventaire bijoux</h1>
          <p className="text-sm text-muted-foreground">
            Vue compacte pour le stock, les ventes et les actions rapides de boutique.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <div className="rounded-xl border bg-card px-4 py-2 text-sm shadow-sm sm:rounded-2xl">
            <span className="text-muted-foreground">Stock faible</span>
            <p className="font-semibold">{lowStockCount} references</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-2 text-sm shadow-sm sm:rounded-2xl">
            <span className="text-muted-foreground">Rupture</span>
            <p className="font-semibold">{outOfStockCount} references</p>
          </div>
          <Button asChild className="col-span-2 justify-center gold-gradient text-accent-foreground hover:opacity-90 sm:col-span-1">
            <Link to="/jewelry/add">+ Ajouter un bijou</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.7fr_0.7fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, code ou categorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as JewelryStatusFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              {jewelryStatusOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(value) => setSortKey(value as JewelrySortKey)}>
            <SelectTrigger>
              <SelectValue placeholder="Trier" />
            </SelectTrigger>
            <SelectContent>
              {jewelrySortOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="hidden items-center gap-4 border-b bg-muted/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground xl:grid xl:grid-cols-[minmax(240px,1.6fr)_110px_90px_110px_130px_120px_60px]">
          <div className="flex items-center gap-2">
            <Package2 className="h-4 w-4" />
            Reference
          </div>
          <div>Statut</div>
          <div className="text-right">Stock</div>
          <div className="text-right">Poids</div>
          <div className="text-right">Prix vente</div>
          <div className="text-right">Prix achat</div>
          <div className="text-right">
            <ArrowUpDown className="ml-auto h-4 w-4" />
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Chargement de l'inventaire...</div>
        ) : paginatedJewelry.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <TriangleAlert className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">Aucune reference trouvee</p>
            <p className="text-sm text-muted-foreground">Essayez un autre filtre ou ajoutez un nouveau bijou.</p>
          </div>
        ) : (
          <div className="divide-y">
            {paginatedJewelry.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 px-4 py-4 transition-colors hover:bg-muted/30 xl:grid-cols-[minmax(240px,1.6fr)_110px_90px_110px_130px_120px_60px] xl:items-center"
              >
                <div className="flex items-center gap-3">
                  {item.photo ? (
                    <img src={item.photo} alt={item.name} className="h-11 w-11 rounded-full object-cover ring-1 ring-border" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-base">💎</div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {item.code}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                        {formatJewelryMaterial(item.material_type)}
                      </span>
                    </div>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {formatJewelryMaterial(item.material_type)} · {item.category} · cree le {new Date(item.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                <div className="xl:justify-self-start">
                  <StatusBadge status={item.status} />
                </div>

                <div className="flex items-center justify-between text-sm xl:block xl:text-right">
                  <span className="text-xs text-muted-foreground xl:hidden">Stock</span>
                  <span className={`font-semibold ${item.quantity <= 3 ? 'text-amber-600' : ''}`}>{item.quantity}</span>
                </div>

                <div className="flex items-center justify-between text-sm xl:block xl:text-right">
                  <span className="text-xs text-muted-foreground xl:hidden">Poids</span>
                  <span>{item.weight.toFixed(2)} g</span>
                </div>

                <div className="flex items-center justify-between text-sm xl:block xl:text-right">
                  <span className="text-xs text-muted-foreground xl:hidden">Prix vente</span>
                  <span className="font-semibold">{formatCFA(getJewelryTotalPrice(item))}</span>
                </div>

                <div className="flex items-center justify-between text-sm xl:block xl:text-right">
                  <span className="text-xs text-muted-foreground xl:hidden">Prix achat</span>
                  <span>{formatCFA(item.purchase_price)}</span>
                </div>

                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel>Actions rapides</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEditor(item)}>
                        <PencilLine className="mr-2 h-4 w-4" />
                        Modifier la fiche
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStockAdjustment({ item, direction: 'add', quantity: '1', reason: '' })}
                      >
                        <CirclePlus className="mr-2 h-4 w-4" />
                        Entrée de stock
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStockAdjustment({ item, direction: 'remove', quantity: '1', reason: '' })}
                      >
                        <CircleMinus className="mr-2 h-4 w-4" />
                        Sortie de stock
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => void handleQuickStatus(item, 'available', Math.max(1, item.quantity))}>
                        Marquer disponible
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleQuickStatus(item, 'out_of_stock', 0)}>
                        Marquer en rupture
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredJewelry.length} references · page {page} sur {totalPages}
        </p>

        <Pagination className="mx-0 w-full justify-start overflow-x-auto md:w-auto md:justify-end">
          <PaginationContent className="min-w-max">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((pageNumber) => Math.abs(pageNumber - page) <= 1 || pageNumber === 1 || pageNumber === totalPages)
              .map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(pageNumber);
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setUploadingPhoto(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier la reference</DialogTitle>
            <DialogDescription>Ajustez le stock, les prix ou le statut sans quitter l'inventaire.</DialogDescription>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Matiere</Label>
                <Select value={editing.material_type} onValueChange={(value) => setEditing({ ...editing, material_type: value })}>
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
                <Label>Nom</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Quantite</Label>
                <Input
                  type="number"
                  min="0"
                  value={editing.quantity}
                  onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Poids (g)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editing.weight}
                  onChange={(e) => setEditing({ ...editing, weight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Select value={editing.category} onValueChange={(value) => setEditing({ ...editing, category: value })}>
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
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={editing.status} onValueChange={(value) => setEditing({ ...editing, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {jewelryStatusOptions
                      .filter((option) => option.key === 'available' || option.key === 'out_of_stock')
                      .map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prix achat</Label>
                <Input
                  type="number"
                  min="0"
                  value={editing.purchase_price}
                  onChange={(e) => setEditing({ ...editing, purchase_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prix total vente</Label>
                <Input
                  value={formatCFA(calculateSalePrice(editing.weight, editing.price_per_gram))}
                  readOnly
                  className="bg-muted font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Prix unitaire / gramme</Label>
                <Input
                  type="number"
                  min="0"
                  value={editing.price_per_gram}
                  onChange={(e) => setEditing({ ...editing, price_per_gram: e.target.value })}
                />
              </div>
              <div className="space-y-3 sm:col-span-2">
                <Label>Image</Label>
                <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
                  <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4 text-center transition hover:bg-muted/50">
                    <ImagePlus className="mb-3 h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {uploadingPhoto ? 'Import en cours...' : 'Importer une image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPhoto}
                      onChange={(e) => {
                        void handleEditImageFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  <div className="flex min-h-32 items-center justify-center rounded-2xl border bg-background p-4">
                    {editing.photo ? (
                      <img src={editing.photo} alt={editing.name} className="max-h-28 rounded-xl object-cover" />
                    ) : (
                      <p className="text-sm text-muted-foreground">Apercu image</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={editing.photo}
                    onChange={(e) => setEditing({ ...editing, photo: e.target.value })}
                    placeholder="Ou collez une URL d'image"
                  />
                  <Button type="button" variant="outline" onClick={() => setEditing({ ...editing, photo: '' })} className="sm:shrink-0">
                    Retirer
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => void handleSaveEdit()}
              disabled={updateJewelry.isPending || uploadingPhoto}
              className="gold-gradient text-accent-foreground hover:opacity-90"
            >
              {updateJewelry.isPending ? 'Enregistrement...' : uploadingPhoto ? 'Import image...' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockAdjustment} onOpenChange={(open) => !open && setStockAdjustment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {stockAdjustment?.direction === 'add' ? 'Enregistrer une entrée' : 'Enregistrer une sortie'}
            </DialogTitle>
            <DialogDescription>
              {stockAdjustment?.item.name} · stock actuel {stockAdjustment?.item.quantity ?? 0}
            </DialogDescription>
          </DialogHeader>

          {stockAdjustment ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stock-adjustment-quantity">Quantité</Label>
                <Input
                  id="stock-adjustment-quantity"
                  type="number"
                  min="1"
                  max={stockAdjustment.direction === 'remove' ? stockAdjustment.item.quantity : undefined}
                  value={stockAdjustment.quantity}
                  onChange={(event) =>
                    setStockAdjustment({ ...stockAdjustment, quantity: event.target.value })
                  }
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-adjustment-reason">Motif</Label>
                <Textarea
                  id="stock-adjustment-reason"
                  value={stockAdjustment.reason}
                  onChange={(event) => setStockAdjustment({ ...stockAdjustment, reason: event.target.value })}
                  placeholder={
                    stockAdjustment.direction === 'add'
                      ? 'Réception fournisseur, correction inventaire...'
                      : 'Casse, perte, correction inventaire...'
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-between rounded-lg bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Stock après mouvement</span>
                <span className="font-bold">
                  {Math.max(
                    0,
                    stockAdjustment.item.quantity +
                      (stockAdjustment.direction === 'add' ? 1 : -1) *
                        Math.max(0, Number(stockAdjustment.quantity || 0)),
                  )}
                </span>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStockAdjustment(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => void handleStockAdjustment()}
              disabled={
                adjustJewelryStock.isPending ||
                !stockAdjustment?.reason.trim() ||
                Number(stockAdjustment?.quantity || 0) <= 0
              }
              className="gold-gradient text-accent-foreground hover:opacity-90"
            >
              {adjustJewelryStock.isPending ? 'Enregistrement...' : 'Enregistrer le mouvement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JewelryPage;
