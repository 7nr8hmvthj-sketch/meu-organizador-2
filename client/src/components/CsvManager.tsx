import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Upload } from "lucide-react";
import Papa from "papaparse";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CsvManager({ open, onOpenChange, allEvents }: { open: boolean, onOpenChange: (open: boolean) => void, allEvents: any[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  
  const createManyMutation = trpc.events.createMany.useMutation({
    onSuccess: () => {
      toast.success("Sincronização concluída com sucesso!");
      utils.events.list.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error("Erro: " + err.message)
  });

  const handleExport = () => {
    const data = allEvents.map(e => ({
      Data: e.date.split('T')[0],
      Tipo: e.type,
      'Horario Inicio': e.startTime || "",
      'Horario Fim': e.endTime || "",
      Descricao: e.description || ""
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Minha_Escala_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      transformHeader: (header) => header.trim().replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ""), // Remove BOM character invisível do Excel
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.error("CSV Parse Errors:", results.errors);
          toast.error("Erro ao ler formato do CSV. Salve como 'CSV (UTF-8)' e tente novamente.");
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const parsed = results.data as any[];
        // COMPARADOR INTELIGENTE (Prevenção de Duplicatas)
        const existingKeys = new Set(allEvents.map(ev => `${ev.date.split('T')[0]}_${ev.type}_${ev.startTime || ''}`));
        
        const eventsToCreate: any[] = [];
        let duplicates = 0;

        parsed.forEach(row => {
           // Limpa as chaves para evitar espaços em branco invisíveis
           const cleanRow: any = {};
           Object.keys(row).forEach(k => { cleanRow[k.trim()] = row[k]; });

           let rawDate = cleanRow.Data || cleanRow.data || "";
           if(!rawDate) return;

           let dateStr = rawDate.trim();
           if (dateStr.includes('/')) {
             const parts = dateStr.split('/');
             if (parts.length === 3) {
               // Trata ano com 2 digitos (ex: 26 -> 2026)
               const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
               dateStr = `${year}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
             }
           }

           const tipo = cleanRow.Tipo || cleanRow.tipo || "";
           if(!tipo) return;

           const startTime = cleanRow['Horario Inicio'] || cleanRow['Horário Início'] || cleanRow.horario_inicio || cleanRow.startTime || "";
           const endTime = cleanRow['Horario Fim'] || cleanRow['Horário Fim'] || cleanRow.horario_fim || cleanRow.endTime || "";
           const desc = cleanRow.Descricao || cleanRow.Descrição || cleanRow.descricao || "";

           const key = `${dateStr}_${tipo.trim()}_${startTime.trim()}`;
           if (existingKeys.has(key)) {
             duplicates++;
           } else {
             eventsToCreate.push({
               date: dateStr,
               type: tipo.trim(),
               startTime: startTime.trim() || undefined,
               endTime: endTime.trim() || undefined,
               description: desc.trim() || undefined,
               isShift: ["hc", "zn", "noturno", "apoio", "corredor", "porta", "sala", "enfermaria", "home care", "observação", "observacao"].some(k => tipo.toLowerCase().includes(k))
             });
             existingKeys.add(key); 
           }
        });

        if (eventsToCreate.length === 0) {
           toast.info(`Nenhum evento novo. ${duplicates} eventos da planilha já existiam na agenda.`);
           if (fileInputRef.current) fileInputRef.current.value = '';
           return;
        }

        toast.loading(`Encontrados ${eventsToCreate.length} eventos novos. Sincronizando...`);
        createManyMutation.mutate(eventsToCreate);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error) => {
        toast.error(`Falha no leitor CSV: ${error.message}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar e Exportar CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
           <p className="text-sm text-muted-foreground">O sistema possui um comparador inteligente: se você importar um mês que já foi importado, ele pulará os plantões repetidos automaticamente.</p>
           
           <div className="flex flex-col gap-3 mt-4">
             <Button onClick={handleExport} className="w-full flex items-center gap-2" variant="outline">
               <Download className="w-4 h-4" /> Exportar Agenda Atual (CSV)
             </Button>

             <div className="relative">
               <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
               <Button className="w-full flex items-center gap-2" variant="default">
                 <Upload className="w-4 h-4" /> Subir Planilha Externa (CSV)
               </Button>
             </div>
           </div>

           <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground mt-2 border">
             <strong className="text-foreground">Formato esperado na Planilha Externa:</strong><br/>
             O arquivo deve ter colunas com os nomes exatos:<br/>
             <code className="text-primary font-bold">Data, Tipo, Horario Inicio, Horario Fim, Descricao</code><br/>
             <em>*Data pode ser no formato DD/MM/AAAA ou AAAA-MM-DD</em>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
