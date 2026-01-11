import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Plus, Pencil, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Finance() {
  const utils = trpc.useUtils();
  const { data: expenses = [], isLoading } = trpc.expenses.list.useQuery();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<typeof expenses[0] | null>(null);
  
  // Form states
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDay, setNewDueDay] = useState("1");
  const [newCategory, setNewCategory] = useState<"fixed" | "variable">("fixed");

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Mutations
  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      setShowAddModal(false);
      resetForm();
      toast.success("Despesa criada com sucesso!");
    },
  });

  const updateMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      setShowEditModal(false);
      setSelectedExpense(null);
      toast.success("Despesa atualizada!");
    },
  });

  const togglePaidMutation = trpc.expenses.togglePaid.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
    },
  });

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      toast.success("Despesa excluída!");
    },
  });

  const resetForm = () => {
    setNewName("");
    setNewAmount("");
    setNewDueDay("1");
    setNewCategory("fixed");
  };

  // Calculate totals
  const totals = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);
    const paid = expenses.filter(e => e.isPaid).reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);
    const pending = total - paid;
    return { total, paid, pending };
  }, [expenses]);

  // Separate by category
  const fixedExpenses = expenses.filter(e => e.category === "fixed");
  const variableExpenses = expenses.filter(e => e.category === "variable");

  const handleCreate = () => {
    if (!newName || !newAmount) {
      toast.error("Preencha todos os campos");
      return;
    }
    createMutation.mutate({
      name: newName,
      amount: newAmount,
      dueDay: parseInt(newDueDay),
      category: newCategory,
    });
  };

  const handleUpdate = () => {
    if (!selectedExpense) return;
    updateMutation.mutate({
      id: selectedExpense.id,
      name: newName || undefined,
      amount: newAmount || undefined,
      dueDay: parseInt(newDueDay) || undefined,
      category: newCategory,
    });
  };

  const openEditModal = (expense: typeof expenses[0]) => {
    setSelectedExpense(expense);
    setNewName(expense.name);
    setNewAmount(String(expense.amount));
    setNewDueDay(String(expense.dueDay));
    setNewCategory(expense.category);
    setShowEditModal(true);
  };

  const handleTogglePaid = (expense: typeof expenses[0]) => {
    togglePaidMutation.mutate({
      id: expense.id,
      isPaid: !expense.isPaid,
      month: currentMonth,
      year: currentYear,
    });
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ExpenseItem = ({ expense }: { expense: typeof expenses[0] }) => (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${expense.isPaid ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-card"}`}>
      <Checkbox
        checked={expense.isPaid}
        onCheckedChange={() => handleTogglePaid(expense)}
        className="h-5 w-5"
      />
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${expense.isPaid ? "line-through text-muted-foreground" : ""}`}>
          {expense.name}
        </p>
        <p className="text-sm text-muted-foreground">
          Vencimento: dia {expense.dueDay}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${expense.isPaid ? "text-green-600" : ""}`}>
          {formatCurrency(expense.amount)}
        </p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => openEditModal(expense)}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500"
          onClick={() => {
            if (confirm("Tem certeza que deseja excluir esta despesa?")) {
              deleteMutation.mutate({ id: expense.id });
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Controle Financeiro
          </h1>
          <p className="text-muted-foreground">Gerencie suas contas e despesas</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Despesa
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-400">Total Pago</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(totals.paid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-400">Pendente</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(totals.pending)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-400">Total do Mês</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(totals.total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Contas Fixas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fixedExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma conta fixa cadastrada
            </p>
          ) : (
            fixedExpenses.map(expense => (
              <ExpenseItem key={expense.id} expense={expense} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Variable Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Contas Variáveis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {variableExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma conta variável cadastrada
            </p>
          ) : (
            variableExpenses.map(expense => (
              <ExpenseItem key={expense.id} expense={expense} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Aluguel"
              />
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Dia de Vencimento</Label>
              <Select value={newDueDay} onValueChange={setNewDueDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={String(day)}>Dia {day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as "fixed" | "variable")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixa</SelectItem>
                  <SelectItem value="variable">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Dia de Vencimento</Label>
              <Select value={newDueDay} onValueChange={setNewDueDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={String(day)}>Dia {day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as "fixed" | "variable")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixa</SelectItem>
                  <SelectItem value="variable">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
