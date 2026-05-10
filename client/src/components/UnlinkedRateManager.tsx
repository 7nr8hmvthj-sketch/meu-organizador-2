import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, Edit2, Plus } from "lucide-react";

interface UnlinkedRateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnlinkedRateManager({
  open,
  onOpenChange,
}: UnlinkedRateManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    hourlyRate: "",
    type: "automatico" as "automatico" | "pessoal",
  });

  const utils = trpc.useUtils();
  const { data: rates, isLoading } = trpc.unlinkedRates.list.useQuery();

  const createMutation = trpc.unlinkedRates.create.useMutation({
    onSuccess: () => {
      utils.unlinkedRates.list.invalidate();
      utils.workplaces.getMonthlySummary.invalidate();
      toast.success("Taxa de plantão criada com sucesso");
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao criar taxa: ${error.message}`);
    },
  });

  const updateMutation = trpc.unlinkedRates.update.useMutation({
    onSuccess: () => {
      utils.unlinkedRates.list.invalidate();
      utils.workplaces.getMonthlySummary.invalidate();
      toast.success("Taxa de plantão atualizada com sucesso");
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar taxa: ${error.message}`);
    },
  });

  const deleteMutation = trpc.unlinkedRates.delete.useMutation({
    onSuccess: () => {
      utils.unlinkedRates.list.invalidate();
      utils.workplaces.getMonthlySummary.invalidate();
      toast.success("Taxa de plantão deletada com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao deletar taxa: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", hourlyRate: "", type: "automatico" });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.hourlyRate) {
      toast.error("Preencha todos os campos");
      return;
    }

    const payload = {
      name: formData.name,
      hourlyRate: parseFloat(formData.hourlyRate),
      type: formData.type,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (rate: any) => {
    setFormData({
      name: rate.name,
      hourlyRate: rate.hourlyRate.toString(),
      type: rate.type,
    });
    setEditingId(rate.id);
    setIsEditing(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja deletar esta taxa?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestão de Plantões Avulsos</DialogTitle>
          <DialogDescription>
            Crie e gerencie as taxas horárias para plantões avulsos (sem vínculo
            com locais de trabalho)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário */}
          <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
            <div>
              <label className="text-sm font-medium">Nome da Taxa</label>
              <Input
                placeholder="Ex: Noturno ZN, Plantão Extra, etc"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Valor/Hora (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 136.00"
                  value={formData.hourlyRate}
                  onChange={(e) =>
                    setFormData({ ...formData, hourlyRate: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      type: value as "automatico" | "pessoal",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatico">Automático</SelectItem>
                    <SelectItem value="pessoal">Pessoal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lista de Taxas */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Taxas Cadastradas</h3>
            {isLoading ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : rates && rates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Valor/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>{rate.name}</TableCell>
                      <TableCell>
                        R$ {Number(rate.hourlyRate).toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {rate.type}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(rate)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(rate.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500">
                Nenhuma taxa cadastrada. Crie uma nova!
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Fechar
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
            {isEditing ? "Atualizar" : "Criar"} Taxa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
