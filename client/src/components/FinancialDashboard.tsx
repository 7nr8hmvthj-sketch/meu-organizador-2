import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Clock, DollarSign } from "lucide-react";

export default function FinancialDashboard({ targetDate }: { targetDate: Date }) {
  const currentMonthNum = targetDate.getMonth() + 1;
  const currentYearNum = targetDate.getFullYear();

  const { data: financialData, isLoading } = trpc.workplaces.getMonthlySummary.useQuery({ 
    month: currentMonthNum, 
    year: currentYearNum 
  });

  if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground">Carregando painel financeiro...</div>;
  if (!financialData) return null;

  return (
    <div className="space-y-4">
      <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-600 font-semibold uppercase">Total a Receber ({String(financialData.receivingMonth).padStart(2, '0')}/{financialData.receivingYear})</p>
            <p className="text-xs text-muted-foreground">Trabalhado em: {String(financialData.workedMonth).padStart(2, '0')}/{financialData.workedYear}</p>
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            R$ {financialData.totalRecebimentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>

      <h3 className="text-sm font-bold mt-4 flex items-center gap-2"><Building className="w-4 h-4"/> Locais de Atendimento (Ciclos Específicos)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {financialData.workplacesSummary.map((wp: any) => (
          <Card className="shadow-sm" key={wp.id}>
            <CardContent className="p-3">
              <div className="flex justify-between border-b pb-2 mb-2">
                <div>
                  <div className="font-bold text-sm">{wp.name}</div>
                  <div className="text-[10px] text-muted-foreground">Corte: {wp.cycleStart.split('-').reverse().join('/')} a {wp.cycleEnd.split('-').reverse().join('/')}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">R$ {wp.hourlyRate}/h</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                  <Clock className="w-3 h-3"/> {wp.hours}h
                </div>
                <div className="font-bold text-sm text-emerald-600">
                  R$ {wp.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {financialData.unlinkedSummary && financialData.unlinkedSummary.length > 0 && (
        <>
          <h3 className="text-sm font-bold mt-4 flex items-center gap-2"><DollarSign className="w-4 h-4"/> Plantões Avulsos (Mês Cheio)</h3>
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
                      <Clock className="w-3 h-3"/> {avulso.hours}h
                    </div>
                    <div className="font-bold text-sm text-emerald-600">
                      R$ {avulso.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
