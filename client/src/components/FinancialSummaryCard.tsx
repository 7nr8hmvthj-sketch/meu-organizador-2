import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Briefcase, AlertTriangle, TrendingUp, Clock } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Componente Principal ─────────────────────────────────────────────────────

export function FinancialSummaryCard() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [year, setYear] = useState(today.getFullYear());

  // ─── Query: resumo por workplace ──────────────────────────────────────────
  const { data: summary = [], isLoading: loadingSummary } =
    trpc.workplaces.getMonthlySummary.useQuery({ month, year });

  // ─── Query: eventos do mês para detectar plantões sem vínculo ────────────
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: monthEvents = [] } = trpc.events.listByDateRange.useQuery({
    startDate,
    endDate,
  });

  // Plantões sem workplaceId vinculado (os "dinheiro na mesa")
  const unlinkedShifts = monthEvents.filter(
    (e: any) => e.isShift && !e.isCancelled && !e.workplaceId
  );

  // ─── Totais consolidados ──────────────────────────────────────────────────
  const totalHours = summary.reduce((acc: number, wp: any) => acc + (wp.totalHours ?? 0), 0);
  const totalValue = summary.reduce((acc: number, wp: any) => acc + (wp.totalValue ?? 0), 0);

  // ─── Navegação de mês ─────────────────────────────────────────────────────
  const goToPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Card className="border-l-4 border-l-emerald-500 shadow-sm">
      <CardHeader className="pb-3">
        {/* Título + Navegação */}
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            Recebimentos por Local de Trabalho
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {MONTH_NAMES[month - 1]} {year}
              {isCurrentMonth && (
                <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 rounded px-1 py-0.5 font-semibold">
                  Atual
                </span>
              )}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Alerta: plantões sem vínculo */}
        {unlinkedShifts.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            <p className="text-sm leading-snug">
              <span className="font-semibold">Atenção:</span> Você possui{" "}
              <span className="font-bold">{unlinkedShifts.length}</span>{" "}
              {unlinkedShifts.length === 1 ? "plantão" : "plantões"} neste mês sem Local de Trabalho vinculado.
              {" "}Eles não estão sendo contabilizados no cálculo abaixo.
            </p>
          </div>
        )}

        {/* Loading */}
        {loadingSummary ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : summary.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Nenhum local de trabalho cadastrado ou nenhum plantão vinculado neste mês.
          </div>
        ) : (
          <>
            {/* Tabela de Resumo */}
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Local de Trabalho</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">
                      <span className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> Horas
                      </span>
                    </th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                      <span className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" /> Total a Receber
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((wp: any, idx: number) => (
                    <tr
                      key={wp.workplaceId}
                      className={`border-b border-border last:border-0 transition-colors hover:bg-muted/20 ${
                        idx % 2 === 0 ? "" : "bg-muted/10"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">{wp.workplaceName}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                        {wp.totalHours > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            {wp.totalHours}h
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                        {formatCurrency(wp.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Linha de Total */}
                <tfoot>
                  <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                    <td className="px-4 py-3 font-bold text-emerald-800">Total do Mês</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-800 tabular-nums">
                      {totalHours > 0 ? `${totalHours}h` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800 text-base">
                      {formatCurrency(totalValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Rodapé informativo */}
            {totalValue > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                * Valores calculados com base nas horas e taxas dos locais de trabalho cadastrados.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
