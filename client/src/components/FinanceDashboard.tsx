import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building2, User, CreditCard, Receipt, ArrowRightLeft, Wallet } from "lucide-react";

// ─── Helper ───────────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function FinanceDashboard() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Busca os itens financeiros do utilizador autenticado (filtrado por userId no servidor)
  const { data: financeItems = [], isLoading } = trpc.financeItems.getItems.useQuery({});

  // Busca o total a receber do motor de plantões
  const { data: monthlySummary } = trpc.workplaces.getMonthlySummary.useQuery({
    month: currentMonth,
    year: currentYear,
  });

  // ─── Extrai valores dinâmicos com fallback seguro para R$ 0,00 ───────────────
  const getItemValue = (tab: string, titleFragment: string): number => {
    const item = financeItems.find(
      (i: any) => i.tab === tab && i.title.toLowerCase().includes(titleFragment.toLowerCase())
    );
    return item ? parseFloat(item.amount) || 0 : 0;
  };

  const saldoPJ       = getItemValue("PJ", "Saldo Conta");
  const cartaoPJ      = getItemValue("PJ", "Cartão Corporativo");
  const totalAReceber = monthlySummary?.totalRecebimentos ?? 0;

  // Impostos PJ: soma DAS + DARF + Contador
  const impostosDAS   = getItemValue("PJ", "DAS");
  const impostosDARF  = getItemValue("PJ", "DARF");
  const contador      = getItemValue("PJ", "Contador");
  const totalImpostos = impostosDAS + impostosDARF + contador;

  // Cartões PF: soma todas as faturas PF
  const cartaoPF1     = getItemValue("PF", "Itaú");
  const cartaoPF2     = getItemValue("PF", "Passaí");
  const totalCartoesPF = cartaoPF1 + cartaoPF2;

  // Custo de vida PF: soma moradia + desenvolvimento
  const aluguel       = getItemValue("PF", "Aluguel");
  const luz           = getItemValue("PF", "Luz");
  const agua          = getItemValue("PF", "Água");
  const internet      = getItemValue("PF", "Internet");
  const totalMoradia  = aluguel + luz + agua + internet;

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 text-center text-sm text-muted-foreground">
        Carregando painel financeiro...
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Panorama Financeiro</h2>
      </div>

      <Tabs defaultValue="pj" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="pj" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Empresa (PJ)
          </TabsTrigger>
          <TabsTrigger value="pf" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Pessoal (PF)
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA PJ ─── */}
        <TabsContent value="pj" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Saldo PJ — dinâmico */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(saldoPJ)}</div>
                <p className="text-xs text-muted-foreground mt-1">Conta Empresa</p>
              </CardContent>
            </Card>

            {/* A Receber — motor de plantões */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAReceber)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Motor de plantões — {String(currentMonth).padStart(2, "0")}/{currentYear}
                </p>
              </CardContent>
            </Card>

            {/* A Pagar — soma impostos PJ */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Pagar (Previsão)</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalImpostos)}</div>
                <p className="text-xs text-muted-foreground mt-1">Custos PJ e Impostos</p>
              </CardContent>
            </Card>
          </div>

          {/* Cartão PJ + Obrigações */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cartão Corporativo — dinâmico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Cartão Corporativo
                </CardTitle>
                <CardDescription>Fatura em aberto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{formatCurrency(cartaoPJ)}</p>
                    <p className="text-sm text-red-500 font-medium">Vencimento: Conforme fechamento</p>
                  </div>
                  <Button variant="outline">Marcar Pago</Button>
                </div>
              </CardContent>
            </Card>

            {/* Impostos — dinâmico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Impostos e Obrigações
                </CardTitle>
                <CardDescription>Obrigações da Pessoa Jurídica</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Guia DAS</p>
                    <p className="text-sm text-muted-foreground">
                      {impostosDAS > 0 ? formatCurrency(impostosDAS) : "Simples Nacional"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">Registrar</Button>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <div>
                    <p className="font-medium">DARF / Contabilidade</p>
                    <p className="text-sm text-muted-foreground">
                      {(impostosDARF + contador) > 0
                        ? formatCurrency(impostosDARF + contador)
                        : "Honorários e IR"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">Registrar</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Repasse para PF */}
          <Card className="mt-6 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle>Repasse para Pessoa Física (Pró-labore)</CardTitle>
              <CardDescription>
                Valor disponível para transferência após dedução dos custos da empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-3xl font-bold text-primary">
                {totalAReceber > 0 || totalImpostos > 0
                  ? formatCurrency(Math.max(0, totalAReceber - totalImpostos))
                  : "R$ ---"}
              </div>
              <Button>Registrar Repasse para PF</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA PF ─── */}
        <TabsContent value="pf" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cartões PF */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturas de Cartão</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalCartoesPF)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total em aberto (PF)</p>
              </CardContent>
            </Card>

            {/* Moradia */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo de Moradia</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalMoradia)}</div>
                <p className="text-xs text-muted-foreground mt-1">Aluguel + Consumo + Internet</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento PF</CardTitle>
              <CardDescription>
                Valores carregados do seu perfil financeiro. Edite na aba Financeiro → PF.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {financeItems
                .filter((i: any) => i.tab === "PF")
                .map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm border-b pb-1 last:border-0">
                    <span className="text-muted-foreground">{item.title}</span>
                    <span className={`font-medium ${item.isPaid ? "line-through text-muted-foreground/50" : ""}`}>
                      {formatCurrency(parseFloat(item.amount) || 0)}
                    </span>
                  </div>
                ))}
              {financeItems.filter((i: any) => i.tab === "PF").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum item PF cadastrado. Adicione na aba Financeiro.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
