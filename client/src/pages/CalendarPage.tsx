import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// --- HELPERS ---

// Normaliza a data para YYYY-MM-DD ignorando o offset de timezone para visualização
function normalizeDateKey(dateInput: string | Date): string {
  if (!dateInput) return "";
  if (typeof dateInput === 'string') {
    return dateInput.split('T')[0];
  }
  try {
    return dateInput.toISOString().split('T')[0];
  } catch {
    return format(dateInput, 'yyyy-MM-dd');
  }
}

function getEventColor(type: string, isPassed: boolean): string {
  if (isPassed) return "text-gray-400 bg-gray-50 dark:bg-gray-900/30 border-gray-200";
  const typeLower = (type || "").toLowerCase();
  
  if (typeLower.includes("natação") || typeLower.includes("natacao")) return "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200";
  if (typeLower.includes("musculação") || typeLower.includes("musculacao")) return "text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300 border-green-200";
  if (typeLower.includes("pilates")) return "text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200";
  if (typeLower.includes("hc")) return "text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 border-red-200";
  if (typeLower.includes("zn")) return "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200";
  
  if (typeLower.includes("apoio")) return "text-pink-700 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200";
  if (typeLower.includes("noturno")) return "text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200";
  
  return "text-slate-700 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200";
}

// Mapeamento de turnos para horários (fallback quando não há horário explícito)
const SHIFT_HOURS: Record<string, string> = {
  "hc manhã": "7-13",
  "hc tarde": "13-19",
  "corredor tarde": "13-19",
  "corredor manhã": "7-13",
  "zona norte manhã": "7-13",
  "zona norte tarde": "13-19",
  "zona norte (manhã)": "7-13",
  "zona norte (tarde)": "13-19",
  "noturno": "19-7",
  "noturno (19-07)": "19-7",
  "apoio": "19-01",
  "apoio (19-01)": "19-01",
};

function getEventLabel(event: { type?: string; description?: string | null }): string {
  const type = event.type || "";
  const desc = event.description || "";
  const typeLower = type.toLowerCase();
  
  // 1. Tenta extrair horário no formato HH:MM (com dois-pontos) da descrição ou tipo
  const timeMatchColon = desc.match(/(\d{1,2}:\d{2})/) || type.match(/(\d{1,2}:\d{2})/);
  
  // 2. Tenta extrair horário no formato H-H ou HH-HH (com hífen) do tipo
  const timeMatchHyphen = type.match(/(\d{1,2}-\d{1,2})/);
  
  let timeStr = timeMatchColon ? timeMatchColon[0] : (timeMatchHyphen ? timeMatchHyphen[0] : "");

  // 3. Simplificar o label baseado no tipo
  let label = type;
  if (typeLower.includes("natação") || typeLower.includes("natacao")) label = "Natação";
  else if (typeLower.includes("musculação") || typeLower.includes("musculacao")) label = "Musculação";
  else if (typeLower.includes("pilates")) label = "Pilates";
  else if (typeLower.includes("hc")) label = "HC";
  else if (typeLower.includes("zn") || typeLower.includes("zona norte")) label = "ZN";
  else if (typeLower.includes("noturno")) label = "Noturno";
  else if (typeLower.includes("apoio")) label = "Apoio";
  else if (typeLower.includes("corredor")) label = "Corredor";
  
  // 4. Se não achou horário via regex, tenta pelo mapeamento de turnos
  if (!timeStr) {
    const mappedTime = SHIFT_HOURS[typeLower];
    if (mappedTime) timeStr = mappedTime;
  }
  
  // 5. Retorna label + horário se existir
  if (timeStr && !label.includes(timeStr)) {
    return `${label} ${timeStr}`;
  }
  
  // 6. Fallback: Se não tem horário mas tem descrição curta, usar descrição
  if (!timeStr && desc.length < 20 && desc.length > 0 && desc !== type) {
    return desc;
  }
  
  return label;
}

function extractTimeFromDescription(desc: string): string {
  if (!desc) return "";
  const match = desc.match(/(\d{1,2}):(\d{2})/);
  return match ? match[0] : "";
}

// --- COMPONENT ---

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false);
  
  const [trainingType, setTrainingType] = useState<string>("");
  const [trainingTime, setTrainingTime] = useState<string>("");
  const [trainingDescription, setTrainingDescription] = useState<string>("");

  const { data: events = [] } = trpc.events.list.useQuery();
  const { data: authData } = trpc.auth.checkSimpleAuth.useQuery();
  const utils = trpc.useUtils();

  const isTrainer = authData?.user?.role === "trainer";

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Evento adicionado com sucesso!");
      utils.events.list.invalidate();
      setShowAddTrainingModal(false);
      setTrainingType("");
      setTrainingTime("");
      setTrainingDescription("");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // Lógica de agrupamento com Deduplicação e Normalização de Data
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    const processedIds = new Set<number>();

    if (!events) return map;

    events.forEach(e => {
      if (e.id && processedIds.has(e.id)) return; // Evita duplicatas
      if (e.id) processedIds.add(e.id);

      const dateStr = normalizeDateKey(e.date);
      
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(e);
    });
    return map;
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateStr) || [];
  }, [selectedDate, eventsByDate]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    if (isTrainer) setShowAddTrainingModal(true);
    else setShowDayModal(true);
  };

  const handleAddTraining = () => {
    if (!selectedDate || !trainingType || !trainingTime) {
      toast.error("Preencha tipo e horário.");
      return;
    }
    // Validação de horário
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trainingTime)) {
      toast.error("Horário inválido. Use formato HH:MM.");
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const description = trainingDescription 
      ? `${trainingDescription} ${trainingTime}`
      : `${trainingType} ${trainingTime}`;

    createEventMutation.mutate({
      date: dateStr,
      type: trainingType,
      description: description,
      isShift: false,
    });
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <CalendarIcon className="w-6 h-6" /> Calendário
          </h1>
          <p className="text-muted-foreground text-sm">
            {isTrainer ? "Clique em um dia para adicionar treino." : "Visualize sua programação mensal."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
          Hoje
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-lg font-semibold capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-bold text-muted-foreground uppercase py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 auto-rows-fr">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] bg-gray-50/50 dark:bg-gray-900/10 rounded-md" />
            ))}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate.get(dateStr) || [];
              const isCurrentDay = isToday(day);
              const isOtherMonth = !isSameMonth(day, currentMonth);

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[110px] p-2 rounded-lg text-sm relative border transition-all flex flex-col items-start gap-1 group
                    ${isCurrentDay ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/30"}
                    ${isOtherMonth ? "opacity-40 bg-muted/20" : ""}`}
                >
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
                    ${isCurrentDay ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </span>
                  <div className="w-full space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div 
                        key={e.id} 
                        className={`text-[10px] px-1.5 py-0.5 rounded-sm truncate w-full border-l-2 text-left font-medium ${getEventColor(e.type, e.isPassed)} ${e.isPassed ? "line-through opacity-60" : ""}`}
                      >
                        {getEventLabel(e)}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 3} mais</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-100 border-l-2 border-red-500"></div>
              <span>HC</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-100 border-l-2 border-amber-500"></div>
              <span>ZN</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-100 border-l-2 border-blue-500"></div>
              <span>Natação</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-100 border-l-2 border-green-500"></div>
              <span>Musculação</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-purple-100 border-l-2 border-purple-500"></div>
              <span>Pilates</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-indigo-100 border-l-2 border-indigo-500"></div>
              <span>Noturno</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-pink-100 border-l-2 border-pink-500"></div>
              <span>Apoio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-100 border-l-2 border-gray-400"></div>
              <span className="line-through">Passado</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal para visualizar eventos do dia (usuário admin) */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {selectedDateEvents.length === 0 ? (
              <p className="text-center text-muted-foreground">Sem eventos neste dia.</p>
            ) : (
              selectedDateEvents.map(event => (
                <div key={event.id} className={`p-3 rounded-md border ${getEventColor(event.type, event.isPassed)}`}>
                  <div className="flex justify-between">
                    <span className="font-semibold">{event.type}</span>
                    <span className="text-xs font-mono">{extractTimeFromDescription(event.description || "")}</span>
                  </div>
                  {event.description && (
                    <p className="text-sm mt-1">{event.description.replace(event.type, '').trim()}</p>
                  )}
                  {event.isPassed && event.passedReason && (
                    <p className="text-xs mt-2 text-yellow-600 dark:text-yellow-400 italic">
                      Passado: {event.passedReason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para adicionar treino (treinadoras) */}
      <Dialog open={showAddTrainingModal} onOpenChange={setShowAddTrainingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Treino: {selectedDate && format(selectedDate, "dd/MM/yyyy")}</DialogTitle>
          </DialogHeader>
          
          {/* Mostrar eventos existentes no dia */}
          {selectedDateEvents.length > 0 && (
            <div className="bg-muted/50 rounded-md p-3 mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Eventos neste dia:</p>
              <div className="space-y-1">
                {selectedDateEvents.map(e => (
                  <div key={e.id} className="text-xs flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${e.type.toLowerCase().includes('natação') ? 'bg-blue-500' : e.type.toLowerCase().includes('musculação') ? 'bg-green-500' : e.type.toLowerCase().includes('pilates') ? 'bg-purple-500' : 'bg-gray-400'}`}></div>
                    <span>{getEventLabel(e)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Modalidade *</Label>
              <Select value={trainingType} onValueChange={setTrainingType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Musculação">Musculação</SelectItem>
                  <SelectItem value="Pilates">Pilates</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Input 
                type="time" 
                value={trainingTime} 
                onChange={(e) => setTrainingTime(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea 
                value={trainingDescription} 
                onChange={(e) => setTrainingDescription(e.target.value)}
                placeholder="Ex: Treino de pernas, foco em core..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTrainingModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTraining} disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
