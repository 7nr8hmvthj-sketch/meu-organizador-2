import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, GripVertical, Tags } from "lucide-react";
import { toast } from "sonner";

// Paleta de cores disponíveis para seleção
const COLOR_PALETTE = [
  { name: "Vermelho", value: "text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 border-red-200", preview: "bg-red-500" },
  { name: "Laranja", value: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200", preview: "bg-amber-500" },
  { name: "Amarelo", value: "text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200", preview: "bg-yellow-500" },
  { name: "Verde", value: "text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300 border-green-200", preview: "bg-green-500" },
  { name: "Azul", value: "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200", preview: "bg-blue-500" },
  { name: "Roxo", value: "text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200", preview: "bg-purple-500" },
  { name: "Rosa", value: "text-pink-700 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200", preview: "bg-pink-500" },
  { name: "Índigo", value: "text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200", preview: "bg-indigo-500" },
  { name: "Turquesa", value: "text-teal-700 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200", preview: "bg-teal-500" },
  { name: "Cinza", value: "text-gray-700 bg-gray-100 dark:bg-gray-800/30 dark:text-gray-300 border-gray-300", preview: "bg-gray-500" },
  { name: "Slate", value: "text-slate-700 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200", preview: "bg-slate-500" },
  { name: "Laranja Escuro", value: "text-orange-700 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200", preview: "bg-orange-500" },
];

const CATEGORY_TYPES = [
  { value: "plantao", label: "Plantão" },
  { value: "treino", label: "Treino" },
  { value: "pessoal", label: "Pessoal" },
  { value: "saude", label: "Saúde" },
  { value: "outro", label: "Outro" },
];

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string; color: string; type: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);
  
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0].value);
  const [type, setType] = useState("outro");

  const { data: categories = [], isLoading } = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Categoria criada!");
      utils.categories.list.invalidate();
      setShowAddModal(false);
      resetForm();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const updateMutation = trpc.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Categoria atualizada!");
      utils.categories.list.invalidate();
      setShowEditModal(false);
      setEditingCategory(null);
      resetForm();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Categoria excluída!");
      utils.categories.list.invalidate();
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const resetForm = () => {
    setName("");
    setColor(COLOR_PALETTE[0].value);
    setType("outro");
  };

  const handleCreate = () => {
    if (!name.trim()) { toast.error("Nome obrigatório."); return; }
    createMutation.mutate({ name: name.trim(), color, type, sortOrder: categories.length + 1 });
  };

  const handleEdit = (cat: any) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color);
    setType(cat.type);
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!editingCategory || !name.trim()) { toast.error("Nome obrigatório."); return; }
    updateMutation.mutate({ id: editingCategory.id, name: name.trim(), color, type });
  };

  const handleDeleteClick = (cat: any) => {
    setCategoryToDelete({ id: cat.id, name: cat.name });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) deleteMutation.mutate({ id: categoryToDelete.id });
  };

  const getTypeLabel = (t: string) => CATEGORY_TYPES.find(ct => ct.value === t)?.label || t;
  const getColorPreview = (colorValue: string) => {
    const match = COLOR_PALETTE.find(c => c.value === colorValue);
    return match?.preview || "bg-gray-400";
  };

  // Agrupa categorias por tipo
  const groupedCategories = categories.reduce((acc: Record<string, any[]>, cat: any) => {
    const t = cat.type || "outro";
    if (!acc[t]) acc[t] = [];
    acc[t].push(cat);
    return acc;
  }, {});

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-primary" />
              Gerenciar Categorias
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { resetForm(); setShowAddModal(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Nova Categoria
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma categoria cadastrada.</div>
            ) : (
              Object.entries(groupedCategories).map(([typeKey, cats]) => (
                <div key={typeKey} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">
                    {getTypeLabel(typeKey)}
                  </h3>
                  <div className="space-y-1">
                    {(cats as any[]).map((cat: any) => (
                      <div
                        key={cat.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm ${cat.color || "bg-card"}`}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                          <div className={`w-3 h-3 rounded-full ${getColorPreview(cat.color)}`} />
                          <span className="font-medium">{cat.name}</span>
                          {cat.isDefault && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                              padrão
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cat)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteClick(cat)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Nova Categoria */}
      <Dialog open={showAddModal} onOpenChange={(o) => { setShowAddModal(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Consulta Médica" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map(ct => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cor</label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setColor(c.value)}
                    className={`w-full aspect-square rounded-lg border-2 transition-all ${c.preview} ${
                      color === c.value ? "border-foreground scale-110 shadow-md" : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
              {/* Preview */}
              <div className={`mt-3 p-3 rounded-lg border ${color}`}>
                <span className="font-medium">{name || "Preview da Categoria"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Categoria */}
      <Dialog open={showEditModal} onOpenChange={(o) => { setShowEditModal(o); if (!o) { setEditingCategory(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map(ct => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cor</label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setColor(c.value)}
                    className={`w-full aspect-square rounded-lg border-2 transition-all ${c.preview} ${
                      color === c.value ? "border-foreground scale-110 shadow-md" : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
              <div className={`mt-3 p-3 rounded-lg border ${color}`}>
                <span className="font-medium">{name || "Preview"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Categoria?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Tem certeza que deseja excluir a categoria <strong>"{categoryToDelete?.name}"</strong>?
            Eventos existentes com essa categoria não serão afetados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
