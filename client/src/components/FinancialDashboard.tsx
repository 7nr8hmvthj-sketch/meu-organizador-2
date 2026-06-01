import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building, Clock, DollarSign, Building2, User, CreditCard, Receipt, ArrowRightLeft, Wallet } from "lucide-react";

export default function FinancialDashboard({ targetDate }: { targetDate: Date }) {
  const currentMonthNum = targetDate.getMonth() + 1;
  const currentYearNum = targetDate.getFullYear();

  const { data: financialData, isLoading } = trpc.workplaces.getMonthlySummary.useQuery({
    month: currentMonthNum,
    year: currentYearNum,
  });

  // Busca os itens e saldos reais do usuário logado
  const { data: financeItems } = trpc.financeItems.getItems.useQuery({});

  if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground">Carregando painel financeiro...</div>;
  if (!financialData) return null;

  const totalAReceber = financialData.totalRecebimentos;

  // Extrai dinamicamente os valores de saldo e cartão salvos no banco para este usuário
  const dbSaldoPJ = financeItems?.find((i: any) => i.tab === 'PJ' && i.title.includes('Saldo Conta Empresa'));
  const dbCartaoPJ = financeItems?.find((i: any) => i.tab === 'PJ' && i.title.includes('Cartão Corporativo'));

  const valorSaldoPJ = dbSaldoPJ ? parseFloat(dbSaldoPJ.amount) : 0;
  const valorCartaoPJ = dbCartaoPJ ? parseFloat(dbCartaoPJ.amount) : 0;

  return (
    <div className="w-full space-y-4">
      <Tabs defaultValue="plantoes" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
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

        {/* ─── ABA 1: PLANTÕES (lógica original intacta) ─── */}
        <TabsContent value="plantoes" className="space-y-4">
          <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-semibold uppercase">
                  Total a Receber ({String(financialData.receivingMonth).padStart(2, "0")}/{financialData.receivingYear})
                </p>
                <p className="text-xs text-muted-foreground">
                  Trabalhado em: {String(financialData.workedMonth).padStart(2, "0")}/{financialData.workedYear}
                </p>
              </div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                R$ {financialData.totalRecebimentos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <h3 className="text-sm font-bold mt-4 flex items-center gap-2">
            <Building className="w-4 h-4" /> Locais de Atendimento (Ciclos Específicos)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {financialData.workplacesSummary.map((wp: any) => (
              <Card className="shadow-sm" key={wp.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between border-b pb-2 mb-2">
                    <div>
                      <div className="font-bold text-sm">{wp.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Corte: {wp.cycleStart.split("-").reverse().join("/")} a {wp.cycleEnd.split("-").reverse().join("/")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">R$ {wp.hourlyRate}/h</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                      <Clock className="w-3 h-3" /> {wp.hours}h
                    </div>
                    <div className="font-bold text-sm text-emerald-600">
                      R$ {wp.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {financialData.unlinkedSummary && financialData.unlinkedSummary.length > 0 && (
            <>
              <h3 className="text-sm font-bold mt-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Plantões Avulsos (Mês Cheio)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {financialData.unlinkedSummary.map((avulso: any) => (
                  <Card className="shadow-sm bg-amber-50/30 border-amber-200" key={avulso.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between border-b border-amber-100 pb-2 mb-2">
                        <div>
                          <div className="font-bold text-sm text-amber-800">{avulso.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-amber-700">R$ {avulso.hourlyRate}/h</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1 text-xs font-medium text-amber-700">
                          <Clock className="w-3 h-3" /> {avulso.hours}h
                        </div>
                        <div className="font-bold text-sm text-emerald-600">
                          R$ {avulso.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── ABA 2: EMPRESA (PJ) — mockup visual + total real ─── */}
        <TabsContent value="pj" className="space-y-4">
          {/* Cards de resumo */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* CARD SALDO PJ DINÂMICO */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {valorSaldoPJ.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Conta Empresa</p>
              </CardContent>
            </Card>

            {/* "A Receber" usa o total real do motor de plantões */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {totalAReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Motor de plantões — {String(financialData.receivingMonth).padStart(2, "0")}/{financialData.receivingYear}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Pagar (Previsão)</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">R$ ---</div>
                <p className="text-xs text-muted-foreground mt-1">Custos PJ e Impostos</p>
              </CardContent>
            </Card>
          </div>

          {/* Cartão corporativo e obrigações */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* CARD CARTÃO PJ DINÂMICO */}
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
                    <p className="text-3xl font-bold">
                      R$ {valorCartaoPJ.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-red-500 font-medium">Vencimento: Conforme fechamento</p>
                  </div>
                  <Button variant="outline">Marcar Pago</Button>
                </div>
              </CardContent>
            </Card>

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
                    <p className="text-sm text-muted-foreground">Simples Nacional</p>
                  </div>
                  <Button variant="ghost" size="sm">Registrar</Button>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <div>
                    <p className="font-medium">DARF / Contabilidade</p>
                    <p className="text-sm text-muted-foreground">Honorários e IR</p>
                  </div>
                  <Button variant="ghost" size="sm">Registrar</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Repasse para PF */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle>Repasse para Pessoa Física (Pró-labore)</CardTitle>
              <CardDescription>Valor disponível para transferência após dedução dos custos da empresa.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-3xl font-bold text-primary">R$ ---</div>
              <Button>Registrar Repasse para PF</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA 3: PESSOAL (PF) — placeholder ─── */}
        <TabsContent value="pf">
          <Card>
            <CardHeader>
              <CardTitle>Visão Pessoa Física (Em construção)</CardTitle>
              <CardDescription>
                Aqui controlaremos o Custo de Vida, Dívidas PF e sua Reserva Estratégica.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Integração das contas pessoais acontecerá na próxima fase.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
