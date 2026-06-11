import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, CheckCircle2, Circle, Trash2, Pencil, RefreshCw, Building2, User, CreditCard, Receipt, ArrowRightLeft, Wallet } from "lucide-react";
import { useLocation } from "wouter";
import { FinancialSummaryCard } from "@/components/FinancialSummaryCard";
import { toast } from "sonner";

// --- HELPERS ---

const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
};

export default function FinancePage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [category, setCategory] = useState<"fixed" | "variable">("fixed");

  // ─── FINANCE ITEMS (PJ/PF) — persistidos no banco ───
  type DbFinanceItem = { id: number; userId: number; tab: string; category: string; title: string; amount: string; isPaid: boolean; createdAt: unknown; updatedAt: unknown };

  const { data: allFinanceItems = [], refetch: refetchFinanceItems } = trpc.financeItems.getItems.useQuery({});
  const pjItems: DbFinanceItem[] = allFinanceItems.filter((i: DbFinanceItem) => i.tab === 'PJ');
  const pfItems: DbFinanceItem[] = allFinanceItems.filter((i: DbFinanceItem) => i.tab === 'PF');

  const togglePaidFinanceMutation = trpc.financeItems.togglePaid.useMutation({
    onSuccess: () => { refetchFinanceItems(); toast.success("Status atualizado!"); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const upsertFinanceMutation = trpc.financeItems.upsertItem.useMutation({
    onSuccess: () => { refetchFinanceItems(); setEditingFinanceItem(null); toast.success("Valor atualizado!"); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Modal de edição PJ/PF
  const [editingFinanceItem, setEditingFinanceItem] = useState<DbFinanceItem | null>(null);
  const [editFinanceValue, setEditFinanceValue] = useState("");

  const handleTogglePaidItem = (id: number) => {
    togglePaidFinanceMutation.mutate({ id });
  };

  const handleEditFinanceItem = (item: DbFinanceItem) => {
    setEditingFinanceItem(item);
    setEditFinanceValue(parseFloat(item.amount).toFixed(2));
  };

  const handleSaveFinanceItem = () => {
    if (!editingFinanceItem || !editFinanceValue) return;
    const newValue = parseFloat(editFinanceValue.replace(",", "."));
    if (isNaN(newValue) || newValue < 0) { toast.error("Valor inválido"); return; }
    upsertFinanceMutation.mutate({
      id: editingFinanceItem.id,
      tab: editingFinanceItem.tab as 'PJ' | 'PF',
      category: editingFinanceItem.category,
      title: editingFinanceItem.title,
      amount: newValue,
    });
  };

  // Data Fetching
  const { data: expenses = [], isLoading, refetch } = trpc.expenses.list.useQuery();
  const utils = trpc.useUtils();

  // Query para totalRecebimentos (usado na aba PJ)
  const today = new Date();
  const { data: monthlySummary } = trpc.workplaces.getMonthlySummary.useQuery({
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  });
  const totalAReceber = monthlySummary?.totalRecebimentos ?? 0;
  const receivingMonth = monthlySummary?.receivingMonth ?? today.getMonth() + 1;
  const receivingYear = monthlySummary?.receivingYear ?? today.getFullYear();

  // Mutations
  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast?.success?.("Despesa adicionada!");
      utils?.expenses?.list?.invalidate?.();
      closeModal?.();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`)
  });

  const updateMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast?.success?.("Despesa atualizada!");
      utils?.expenses?.list?.invalidate?.();
      closeModal?.();
    },
    onError: (e) => toast?.error?.(`Erro: ${e?.message}`)
  });

  const togglePaidMutation = trpc.expenses.togglePaid.useMutation({
    onSuccess: () => utils?.expenses?.list?.invalidate?.(),
  });

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast?.success?.("Despesa removida.");
      utils?.expenses?.list?.invalidate?.();
    },
  });

  const resetMutation = trpc.expenses.resetPaidStatus.useMutation({
    onSuccess: () => {
      toast?.success?.("Status de pagamento reiniciado para o novo mês.");
      utils?.expenses?.list?.invalidate?.();
    }
  });

  // --- CALCULATIONS ---

  const summary = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let fixedTotal = 0;
    let variableTotal = 0;

    expenses.forEach(e => {
      const val = parseFloat(String(e.amount));
      total += val;
      if (e.isPaid) paid += val;
      else pending += val;

      if (e.category === 'fixed') fixedTotal += val;
      else variableTotal += val;
    });

    return { total, paid, pending, fixedTotal, variableTotal };
  }, [expenses]);

  // Ordenar por dia de vencimento
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => a.dueDay - b.dueDay);
  }, [expenses]);

  const fixedExpenses = sortedExpenses.filter(e => e.category === 'fixed');
  const variableExpenses = sortedExpenses.filter(e => e.category === 'variable');

  // --- HANDLERS ---

  const handleSave = () => {
    if (!name || !amount || !dueDay) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const payload = {
      name,
      amount: amount.replace(',', '.'),
      dueDay: parseInt(dueDay),
      category
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (expense: typeof expenses[0]) => {
    setEditingId(expense.id);
    setName(expense.name);
    setAmount(String(expense.amount));
    setDueDay(expense.dueDay.toString());
    setCategory(expense.category);
    setShowAddModal(true);
  };

  const handleTogglePaid = (id: number, currentStatus: boolean) => {
    const now = new Date();
    togglePaidMutation.mutate({
      id,
      isPaid: !currentStatus,
      month: !currentStatus ? now.getMonth() + 1 : undefined,
      year: !currentStatus ? now.getFullYear() : undefined
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta despesa?")) {
      deleteMutation.mutate({ id });
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setName("");
    setAmount("");
    setDueDay("");
    setCategory("fixed");
  };

  const handleResetMonth = () => {
    if(confirm("Isso marcará todas as contas como 'Não Pagas' para iniciar um novo mês. Continuar?")) {
      resetMutation.mutate();
    }
  };

  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <DollarSign className="w-6 h-6" /> Gestão Financeira
          </h1>
          <p className="text-muted-foreground text-sm">
            Controle de despesas fixas e variáveis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleResetMonth} title="Reiniciar pagamentos para novo mês">
            <RefreshCw className="w-4 h-4 mr-2" /> Virar Mês
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* ─── TABS PRINCIPAIS ─── */}
      <Tabs defaultValue="plantoes" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="plantoes" className="flex items-center gap-1.5 text-xs sm:text-sm">
            🏥 Plantões
          </TabsTrigger>
          <TabsTrigger value="pj" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Empresa (PJ)</span>
            <span className="sm:hidden">PJ</span>
          </TabsTrigger>
          <TabsTrigger value="pf" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pessoal (PF)</span>
            <span className="sm:hidden">PF</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA 1: PLANTÕES ─── */}
        <TabsContent value="plantoes" className="space-y-6">
          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Previsto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.total)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fixas: {formatCurrency(summary.fixedTotal)} | Var: {formatCurrency(summary.variableTotal)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.paid)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.total > 0 ? Math.round((summary.paid / summary.total) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">A Pagar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(summary.pending)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Faltam {expenses.length - expenses.filter(e => e.isPaid).length} contas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recebimentos por Local de Trabalho */}
          <FinancialSummaryCard />

          {/* Listas de Despesas */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="fixed">Fixas</TabsTrigger>
              <TabsTrigger value="variable">Variáveis</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ExpenseList
                expenses={sortedExpenses}
                onToggle={handleTogglePaid}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>

            <TabsContent value="fixed" className="mt-4">
              <ExpenseList
                expenses={fixedExpenses}
                onToggle={handleTogglePaid}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>

            <TabsContent value="variable" className="mt-4">
              <ExpenseList
                expenses={variableExpenses}
                onToggle={handleTogglePaid}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ─── ABA 2: EMPRESA (PJ) ─── */}
        <TabsContent value="pj" className="space-y-4">
          {/* Cards de resumo */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(allFinanceItems.find((i: DbFinanceItem) => i.tab === 'PJ' && i.title.toLowerCase().includes('saldo conta'))?.amount ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Conta Empresa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalAReceber)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Motor de plantões — {String(receivingMonth).padStart(2, "0")}/{receivingYear}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Pagar (Previsão)</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(pjItems.filter(i => !i.isPaid).reduce((sum, i) => sum + parseFloat(i.amount), 0))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Custos PJ e Impostos</p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de obrigações PJ */}
          <div className="space-y-2">
            {pjItems.map(item => (
              <Card key={item.id} className={`transition-all ${item.isPaid ? 'opacity-50 bg-muted/20' : ''}`}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleTogglePaidItem(item.id)} className={`rounded-full p-1 transition-colors ${item.isPaid ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}>
                      {item.isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <div>
                      <p className={`font-medium ${item.isPaid ? 'line-through text-muted-foreground' : ''}`}>{item.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${item.isPaid ? 'text-muted-foreground line-through' : 'text-red-600'}`}>
                      {formatCurrency(item.amount)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditFinanceItem(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Repasse para PF */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle>Repasse para Pessoa Física (Pró-labore)</CardTitle>
              <CardDescription>Valor disponível após dedução dos custos da empresa.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(totalAReceber - pjItems.filter(i => !i.isPaid).reduce((sum, i) => sum + parseFloat(i.amount), 0))}
              </div>
              <Button onClick={() => toast.success("Repasse registrado (mockup)")}>Registrar Repasse</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA 3: PESSOAL (PF) ─── */}
        <TabsContent value="pf" className="space-y-4">
          {/* Resumo PF */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Despesas PF</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(pfItems.reduce((sum, i) => sum + parseFloat(i.amount), 0))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pagas: {formatCurrency(pfItems.filter(i => i.isPaid).reduce((sum, i) => sum + parseFloat(i.amount), 0))}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendente PF</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(pfItems.filter(i => !i.isPaid).reduce((sum, i) => sum + parseFloat(i.amount), 0))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pfItems.filter(i => !i.isPaid).length} contas em aberto
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de despesas PF */}
          <div className="space-y-2">
            {pfItems.map(item => (
              <Card key={item.id} className={`transition-all ${item.isPaid ? 'opacity-50 bg-muted/20' : ''}`}>
                <div className="flex items-center justify-between p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleTogglePaidItem(item.id)} className={`rounded-full p-1 transition-colors ${item.isPaid ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}>
                      {item.isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <div>
                      <p className={`font-medium text-sm ${item.isPaid ? 'line-through text-muted-foreground' : ''}`}>{item.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${item.isPaid ? 'text-muted-foreground line-through' : 'text-red-600'}`}>
                      {formatCurrency(item.amount)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditFinanceItem(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Editar Item PJ/PF */}
      <Dialog open={!!editingFinanceItem} onOpenChange={(open) => !open && setEditingFinanceItem(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Valor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Despesa</Label>
              <Input value={editingFinanceItem?.title || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Novo Valor (R$)</Label>
              <Input
                value={editFinanceValue}
                onChange={e => setEditFinanceValue(e.target.value)}
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFinanceItem(null)}>Cancelar</Button>
            <Button onClick={handleSaveFinanceItem} disabled={upsertFinanceMutation.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar/Editar */}
      <Dialog open={showAddModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Despesa</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Aluguel, Academia..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Dia Vencimento</Label>
                <Select value={dueDay} onValueChange={setDueDay}>
                  <SelectTrigger><SelectValue placeholder="Dia" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v: "fixed" | "variable") => setCategory(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixa (Recorrente)</SelectItem>
                  <SelectItem value="variable">Variável (Cartão/Outros)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-componente para renderizar a lista
function ExpenseList({ expenses, onToggle, onEdit, onDelete }: {
  expenses: any[];
  onToggle: (id: number, currentStatus: boolean) => void;
  onEdit: (expense: any) => void;
  onDelete: (id: number) => void;
}) {
  if (expenses.length === 0) {
    return (
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="py-12 text-center space-y-3">
          <DollarSign className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">Nenhuma despesa encontrada.</p>
          <p className="text-sm text-muted-foreground/70">Clique em <span className="font-semibold text-primary">"+ Nova Despesa"</span> para começar a controlar seus gastos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Cabeçalho da Tabela - Desktop */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <div className="col-span-1 text-center">Status</div>
        <div className="col-span-1 text-center">Dia</div>
        <div className="col-span-5">Descrição</div>
        <div className="col-span-3 text-right">Valor</div>
        <div className="col-span-2 text-right">Ações</div>
      </div>

      {expenses.map((expense) => (
        <Card key={expense.id} className={`transition-all hover:bg-accent/30 ${expense.isPaid ? 'opacity-60 bg-muted/20' : ''}`}>
          <div className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 items-center">

            {/* Checkbox Status */}
            <div className="col-span-2 md:col-span-1 flex justify-center">
              <button
                onClick={() => onToggle(expense.id, expense.isPaid)}
                className={`rounded-full p-1 transition-colors ${expense.isPaid ? 'text-green-500 hover:text-green-600' : 'text-gray-300 hover:text-gray-400'}`}
              >
                {expense.isPaid ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>
            </div>

            {/* Dia */}
            <div className="col-span-2 md:col-span-1 flex justify-center">
              <span className="text-sm font-bold bg-muted px-2 py-1 rounded text-muted-foreground">
                {expense.dueDay}
              </span>
            </div>

            {/* Nome e Categoria */}
            <div className="col-span-8 md:col-span-5 flex flex-col">
              <span className={`font-medium ${expense.isPaid ? 'line-through text-muted-foreground' : ''}`}>
                {expense.name}
              </span>
              <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                {expense.category === 'fixed' ? 'Fixa' : 'Variável'}
              </span>
            </div>

            {/* Valor */}
            <div className="col-span-6 md:col-span-3 text-left md:text-right font-mono font-medium">
              {formatCurrency(expense.amount)}
            </div>

            {/* Ações */}
            <div className="col-span-6 md:col-span-2 flex justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(expense)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(expense.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
