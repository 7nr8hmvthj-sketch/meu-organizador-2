import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, Briefcase, Info } from "lucide-react";
import { toast } from "sonner";

interface WorkplaceManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WorkplaceManager({ open, onOpenChange }: WorkplaceManagerProps) {
  const utils = trpc.useUtils();
  const { data: workplaces = [], isLoading } = trpc.workplaces.list.useQuery(undefined, { enabled: open });

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number | "">("");
  const [cycleStartDay, setCycleStartDay] = useState<number | "">(20);
  const [cycleEndDay, setCycleEndDay] = useState<number | "">(19);
  const [paymentDelayMonths, setPaymentDelayMonths] = useState<number | "">(0);
  const [paymentDay, setPaymentDay] = useState<number | "">(5);
  const [keywords, setKeywords] = useState("");

  const resetForm = () => {
    setName("");
    setHourlyRate("");
    setCycleStartDay(20);
    setCycleEndDay(19);
    setPaymentDelayMonths(0);
    setPaymentDay(5);
    setKeywords("");
    setEditId(null);
    setIsEditing(false);
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const createMutation = trpc.workplaces.create.useMutation({
    onSuccess: () => {
      toast.success("Local de trabalho adicionado!");
      utils.workplaces.list.invalidate();
      utils.workplaces.getMonthlySummary.invalidate();
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.workplaces.update.useMutation({
    onSuccess: () => {
      toast.success("Local de trabalho atualizado!");
      utils.workplaces.list.invalidate();
      utils.workplaces.getMonthlySummary.invalidate();
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.workplaces.delete.useMutation({
    onSuccess: () => {
      toast.success("Local de trabalho removido!");
      utils.workplaces.list.invalidate();
      utils.workplaces.getMonthlySummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || hourlyRate === "" || cycleStartDay === "" || cycleEndDay === "" || paymentDelayMonths === "" || paymentDay === "" || !keywords) {
      toast.error("Preencha todos os campos.");
      return;
    }

    const payload = {
      name,
      hourlyRate: Number(hourlyRate),
      cycleStartDay: Number(cycleStartDay),
      cycleEndDay: Number(cycleEndDay),
      paymentDelayMonths: Number(paymentDelayMonths),
      paymentDay: Number(paymentDay),
      keywords,
    };

    if (isEditing && editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (wp: any) => {
    setEditId(wp.id);
    setName(wp.name);
    setHourlyRate(Number(wp.hourlyRate));
    setCycleStartDay(wp.cycleStartDay);
    setCycleEndDay(wp.cycleEndDay);
    setPaymentDelayMonths(wp.paymentDelayMonths);
    setPaymentDay(wp.paymentDay);
    setKeywords(wp.keywords);
    setIsEditing(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este local? Todo o histórico financeiro passará a usar as regras padrão.")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" /> 
            Locais de Trabalho (Faturamento)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {!isEditing ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Cadastre as regras de pagamento para cada local.</p>
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Local
                </Button>
              </div>

              {isLoading ? (
                <p className="text-sm text-center py-4">Carregando...</p>
              ) : workplaces.length === 0 ? (
                <div className="bg-muted/30 p-6 text-center rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground mb-2">Nenhum local cadastrado.</p>
                  <p className="text-xs text-muted-foreground">O sistema está usando as regras antigas (ZN e HC).</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workplaces.map((wp) => (
                    <div key={wp.id} className="p-3 border rounded-md bg-card shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="flex-1">
                        <div className="font-semibold text-primary">{wp.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
                          <span>💰 R$ {Number(wp.hourlyRate).toFixed(2)}/h</span>
                          <span>⏳ Atraso: {wp.paymentDelayMonths} mes(es)</span>
                          <span>📅 Ciclo: {wp.cycleStartDay} a {wp.cycleEndDay}</span>
                          <span>🔑 {wp.keywords}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(wp)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="outline" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(wp.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 bg-muted/20 p-4 rounded-md border">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{editId ? "Editar Local" : "Novo Local"}</h3>
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancelar</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome do Local (Ex: Santa Casa)</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Valor da Hora (R$)</Label>
                  <Input type="number" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value ? Number(e.target.value) : "")} required />
                </div>
                
                <div className="space-y-1">
                  <Label>Início do Ciclo (Dia)</Label>
                  <Input type="number" min="1" max="31" value={cycleStartDay} onChange={e => setCycleStartDay(e.target.value ? Number(e.target.value) : "")} required />
                </div>
                <div className="space-y-1">
                  <Label>Fim do Ciclo (Dia)</Label>
                  <Input type="number" min="1" max="31" value={cycleEndDay} onChange={e => setCycleEndDay(e.target.value ? Number(e.target.value) : "")} required />
                </div>

                <div className="space-y-1">
                  <Label>Meses de Atraso (Pgto)</Label>
                  <Input type="number" min="0" max="12" value={paymentDelayMonths} onChange={e => setPaymentDelayMonths(e.target.value !== "" ? Number(e.target.value) : "")} required />
                  <p className="text-[10px] text-muted-foreground">0 = Paga no mês seguinte. 3 = Atraso de 90 dias.</p>
                </div>
                <div className="space-y-1">
                  <Label>Dia do Pagamento</Label>
                  <Input type="number" min="1" max="31" value={paymentDay} onChange={e => setPaymentDay(e.target.value ? Number(e.target.value) : "")} required />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <Label className="flex items-center gap-1">Palavras-Chave (Separadas por vírgula) <Info className="w-3 h-3 text-muted-foreground"/></Label>
                <Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Ex: enfermaria, hc, home care" required />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Se um plantão contiver qualquer uma destas palavras no <b>Tipo</b> ou <b>Observação</b>, as horas serão multiplicadas pelo valor deste local.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar Local"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
