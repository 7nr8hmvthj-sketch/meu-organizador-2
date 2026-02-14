import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Upload, Plus, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ComparisonResult {
  missingInAgenda: Array<{ date: string; type: string; description?: string }>;
  statusDifferences: Array<{ id: number; date: string; type: string; csvStatus: string; agendaStatus: string }>;
  onlyInAgenda: Array<{ id: number; date: string; type: string }>;
  csvSummary: { month: string; count: number; passed: number }[];
}

export default function ComparisonPage() {

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);

  const addEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("✓ Plantão adicionado com sucesso");
    },
    onError: (error) => {
      toast.error(`✗ Erro ao adicionar plantão: ${error.message}`);
    },
  });

  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("✓ Status atualizado com sucesso");
    },
    onError: (error) => {
      toast.error(`✗ Erro ao atualizar status: ${error.message}`);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/trpc/comparison.analyzeCSV", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Erro ao processar CSV");

      const data = await response.json();
      setComparisonResult(data.result);

      toast.success(`✓ CSV analisado com sucesso - ${data.result.missingInAgenda.length} plantões faltando, ${data.result.statusDifferences.length} com diferenças`);
    } catch (error) {
      toast.error(`✗ Erro ao analisar CSV: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = (event: ComparisonResult["missingInAgenda"][0]) => {
    addEventMutation.mutate({
      date: event.date,
      type: event.type,
      description: event.description,
      isShift: true,
    });
  };

  const handleUpdateStatus = (diff: ComparisonResult["statusDifferences"][0]) => {
    const isPassed = diff.csvStatus === "Passei";
    updateEventMutation.mutate({
      id: diff.id,
      isPassed,
      passedReason: isPassed ? "Sincronizado com CSV" : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Comparação CSV vs Agenda</h1>
        <p className="text-muted-foreground mt-2">
          Sincronize seus plantões do arquivo CSV com a agenda
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Arquivo CSV
          </CardTitle>
          <CardDescription>
            Selecione o arquivo Plantaozinho-Exported-Data.csv para análise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading}
              className="flex-1"
            />
            {csvFile && (
              <span className="text-sm text-muted-foreground py-2">
                {csvFile.name}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {!comparisonResult ? (
        <Card className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Envie um arquivo CSV para começar a comparação
          </p>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Análise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {comparisonResult.missingInAgenda.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Faltando na Agenda</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {comparisonResult.statusDifferences.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Diferenças de Status</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonResult.onlyInAgenda.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Apenas na Agenda</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missing in Agenda */}
          {comparisonResult.missingInAgenda.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Faltando na Agenda ({comparisonResult.missingInAgenda.length})
                </CardTitle>
                <CardDescription>
                  Plantões que estão no CSV mas não na sua agenda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonResult.missingInAgenda.map((event, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{event.type}</p>
                        <p className="text-sm text-muted-foreground">{event.date}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddEvent(event)}
                        disabled={addEventMutation.isPending}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Differences */}
          {comparisonResult.statusDifferences.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-yellow-500" />
                  Diferenças de Status ({comparisonResult.statusDifferences.length})
                </CardTitle>
                <CardDescription>
                  Plantões com status diferente entre CSV e Agenda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonResult.statusDifferences.map((diff) => (
                    <div
                      key={diff.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{diff.type}</p>
                        <p className="text-sm text-muted-foreground">{diff.date}</p>
                        <p className="text-xs">
                          CSV: <span className="font-semibold">{diff.csvStatus}</span> |
                          Agenda: <span className="font-semibold">{diff.agendaStatus}</span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(diff)}
                        disabled={updateEventMutation.isPending}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sincronizar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Only in Agenda */}
          {comparisonResult.onlyInAgenda.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  Apenas na Agenda ({comparisonResult.onlyInAgenda.length})
                </CardTitle>
                <CardDescription>
                  Plantões que estão na sua agenda mas não no arquivo CSV
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparisonResult.onlyInAgenda.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{event.type}</p>
                        <p className="text-sm text-muted-foreground">{event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CSV Summary */}
          {comparisonResult.csvSummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resumo do CSV</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {comparisonResult.csvSummary.map((summary) => (
                    <div key={summary.month} className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">{summary.month}</p>
                      <p className="text-lg font-bold">{summary.count}</p>
                      <p className="text-xs text-muted-foreground">
                        {summary.passed} passados
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
