import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building2, User, CreditCard, Receipt, ArrowRightLeft, Wallet } from "lucide-react";

export function FinanceDashboard() {
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

        <TabsContent value="pj" className="space-y-4">
          {/* PAINEL DE CONTROLE PJ */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 31,40</div>
                <p className="text-xs text-muted-foreground mt-1">Conta Empresa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ ---</div>
                <p className="text-xs text-muted-foreground mt-1">Motor de plantões</p>
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

          {/* OBRIGAÇÕES E CARTÃO PJ */}
          <div className="grid gap-4 md:grid-cols-2">
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
                    <p className="text-3xl font-bold">R$ 696,22</p>
                    <p className="text-sm text-red-500 font-medium">Vencimento: 01/06</p>
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

          {/* REPASSE PARA PF */}
          <Card className="mt-6 border-primary/30 bg-primary/5">
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

        <TabsContent value="pf">
          <Card>
            <CardHeader>
              <CardTitle>Visão Pessoa Física (Em construção)</CardTitle>
              <CardDescription>Aqui controlaremos o Custo de Vida, Dívidas PF e sua Reserva Estratégica.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Integração das contas pessoais acontecerá na próxima fase.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
