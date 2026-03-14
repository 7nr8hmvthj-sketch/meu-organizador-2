import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil, Trash2, Plus, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { normalizeDateKey } from "@/lib/dateUtils";

// --- HELPERS ---

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
  if (typeLower.includes("home care")) return "text-teal-700 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200";
  if (typeLower.includes("lembrete")) return "text-gray-700 bg-gray-100 dark:bg-gray-800/30 dark:text-gray-300 border-gray-300";
  
  return "text-slate-700 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200";
}

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

const EVENT_TYPES = [
  { value: "HC 7-13", label: "HC 7-13 (Manhã)" },
  { value: "HC 13-19", label: "HC 13-19 (Tarde)" },
  { value: "ZN 7-13", label: "Zona Norte 7-13 (Manhã)" },
  { value: "ZN 13-19", label: "Zona Norte 13-19 (Tarde)" },
  { value: "Noturno 19-7", label: "Noturno 19-7" },
  { value: "Apoio 19-01", label: "Apoio 19-01" },
  { value: "Corredor Manhã", label: "Corredor Manhã" },
  { value: "Corredor Tarde", label: "Corredor Tarde" },
  { value: "Natação", label: "Natação" },
  { value: "Musculação", label: "Musculação" },
  { value: "Pilates", label: "Pilates" },
  { value: "Home Care", label: "Home Care" },
  { value: "Lembrete", label: "Lembrete" },
  { value: "Outro", label: "Outro (personalizado)" },
];

function getEventLabel(event: { type?: string; description?: string | null }): string {
  const type = event.type || "";
  const desc = event.description || "";
  const typeLower = type.toLowerCase();
  
  const timeMatchColon = desc.match(/(\d{1,2}:\d{2})/) || type.match(/(\d{1,2}:\d{2})/);
  const timeMatchHyphen = type.match(/(\d{1,2}-\d{1,2})/);
  let timeStr = timeMatchColon ? timeMatchColon[0] : (timeMatchHyphen ? timeMatchHyphen[0] : "");

  let label = type;
  if (typeLower.includes("natação")) label = "Natação";
  else if (typeLower.includes("musculação")) label = "Musculação";
  else if (typeLower.includes("pilates")) label = "Pilates";
  else if (typeLower.includes("hc")) label = "HC";
  else if (typeLower.includes("zn") || typeLower.includes("zona norte")) label = "ZN";
  else if (typeLower.includes("noturno")) label = "Noturno";
  else if (typeLower.includes("apoio")) label = "Apoio";
  else if (typeLower.includes("corredor")) label = "Corredor";
  
  if (!timeStr) {
    const mappedTime = SHIFT_HOURS[typeLower];
    if (mappedTime) timeStr = mappedTime;
  }
  
  if (timeStr && !label.includes(timeStr)) return `${label} ${timeStr}`;
  if (!timeStr && desc.length < 20 && desc.length > 0 && desc !== type) return desc;
  
  return label;
}

function extractTimeFromDescription(desc: string): string {
  if (!desc) return "";
  const match = desc.match(/(\d{1,2}):(\d{2})/);
  return match ? match[0] : "";
}

// --- CALCULADOR DE HORAS ZN (Dia 20 ao 19) ---
function calculateZNHours(events: any[], targetDate: Date): number {
  // Define o período: dia 20 do mês anterior até o dia 19 do mês atual
  const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 20);
  const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 19, 23, 59, 59);
  let totalHours = 0;
  events.forEach(event => {
    if (event.isPassed) return; // Ignora os repassados
    // Normaliza data para evitar bug de fuso horário
    const eventDate = new Date(event.date + 'T12:00:00Z');
    
    // Verifica se o evento cai dentro do nosso ciclo (20 a 19)
    if (eventDate >= startDate && eventDate <= endDate) {
      const type = (event.type || "").toLowerCase();
      const desc = (event.description || "").toLowerCase();
      const fullText = `${type} ${desc}`;
      // Regra de Exclusão
      if (fullText.includes("hc") || fullText.includes("home care") || fullText.includes("lembrete")) return;
      // Regra de Inclusão
      if (
        fullText.includes("zn") || 
        fullText.includes("zona norte") || 
        fullText.includes("noturno") || 
        fullText.includes("apoio") || 
        fullText.includes("observação") || 
        fullText.includes("observacao")
      ) {
        // Extrai o horário (ex: "7-13" ou "19-07")
        let timeMatch = fullText.match(/(\d{1,2})-(\d{1,2})/);
        
        // Se não achou no texto, tenta achar no dicionário de horas padrão
        if (!timeMatch && SHIFT_HOURS[type]) {
          timeMatch = SHIFT_HOURS[type].match(/(\d{1,2})-(\d{1,2})/);
        }
        if (timeMatch) {
          const startHour = parseInt(timeMatch[1], 10);
          const endHour = parseInt(timeMatch[2], 10);
          
          let diff = endHour - startHour;
          // Matemática da Madrugada: se terminar menor que começar, soma 24 (ex: 19h as 07h = -12 + 24 = 12h)
          if (diff < 0) diff += 24; 
          
          totalHours += diff;
        }
      }
    }
  });
  return totalHours;
}

export default function CalendarPage() {
  const [, navigate] = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  
  const [trainingType, setTrainingType] = useState<string>("");
  const [trainingTime, setTrainingTime] = useState<string>("");
  const [trainingDescription, setTrainingDescription] = useState<string>("");
  
  const [eventType, setEventType] = useState<string>("");
  const [customEventType, setCustomEventType] = useState<string>("");
  const [eventTime, setEventTime] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");
  
  const [editingEvent, setEditingEvent] = useState<{ id: number; type: string; description: string | null; createdBy?: string | null; date?: string; isPassed?: boolean } | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{ id: number; type: string } | null>(null);
  const [isPassed, setIsPassed] = useState(false);
  
  // Recurrence states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"weekly" | "monthly">("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [monthlyOccurrences, setMonthlyOccurrences] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("2026-12-31");

  const { data: allEvents = [] } = trpc.events.list.useQuery();
  const { data: authData } = trpc.auth.checkSimpleAuth.useQuery();
  const utils = trpc.useUtils();

  // GARANTIA DE DATA: Usa o mesmo helper do Diário para buscar
  const selectedDateKey = selectedDate ? normalizeDateKey(selectedDate) : null;
  
  const { data: diaryEntry } = trpc.diary.get.useQuery(
    { date: selectedDateKey || "" },
    { enabled: !!selectedDateKey && authData?.user?.role === "admin" }
  );

  const isTrainer = authData?.user?.role === "trainer";
  const isAdmin = authData?.user?.role === "admin";
  const currentUsername = authData?.user?.username;
  
  // Filtro de privacidade: oculta Lembretes de trainers
  const events = useMemo(() => {
    return allEvents.filter(event => {
      // Se for Lembrete e NAO for admin, esconde
      if (event.type === "Lembrete" && !isAdmin) return false;
      return true;
    });
  }, [allEvents, isAdmin]);

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      try {
        toast?.success?.("Evento adicionado com sucesso!");
        utils?.events?.list?.invalidate?.();
        setShowAddTrainingModal?.(false);
        setShowAddEventModal?.(false);
        if (typeof resetForm === 'function') resetForm?.();
      } catch (error) {
        console.error('[CalendarPage] Error in createEventMutation.onSuccess:', error);
      }
    },
    onError: (error) => toast?.error?.(`Erro: ${error?.message}`),
  });

  const createManyMutation = trpc.events.createMany.useMutation({
    onSuccess: () => {
      try {
        toast?.success?.("Serie de eventos adicionada com sucesso!");
        utils?.events?.list?.invalidate?.();
        setShowAddEventModal?.(false);
        setIsRecurring?.(false);
        if (typeof resetForm === 'function') resetForm?.();
      } catch (error) {
        console.error('[CalendarPage] Error in createManyMutation.onSuccess:', error);
      }
    },
    onError: (error) => toast?.error?.(`Erro: ${error?.message}`),
  });

  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      try {
        toast?.success?.("Evento atualizado com sucesso!");
        utils?.events?.list?.invalidate?.();
        setShowEditModal?.(false);
        setEditingEvent?.(null);
        if (typeof resetForm === 'function') resetForm?.();
      } catch (error) {
        console.error('[CalendarPage] Error in updateEventMutation.onSuccess:', error);
      }
    },
    onError: (error) => toast?.error?.(`Erro: ${error?.message}`),
  });

  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      try {
        toast?.success?.("Evento excluído com sucesso!");
        utils?.events?.list?.invalidate?.();
        setShowDeleteConfirm?.(false);
        setEventToDelete?.(null);
        setShowDayModal?.(false);
      } catch (error) {
        console.error('[CalendarPage] Error in deleteEventMutation.onSuccess:', error);
      }
    },
    onError: (error) => toast?.error?.(`Erro: ${error?.message}`),
  });

  const resetForm = () => {
    setTrainingType(""); setTrainingTime(""); setTrainingDescription("");
    setEventType(""); setCustomEventType(""); setEventTime(""); setEventDescription("");
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    const processedIds = new Set<number>();
    if (!events) return map;
    events.forEach(e => {
      if (e.id && processedIds.has(e.id)) return;
      if (e.id) processedIds.add(e.id);
      const dateStr = normalizeDateKey(e.date);
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(e);
    });
    return map;
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = normalizeDateKey(selectedDate);
    return eventsByDate.get(dateStr) || [];
  }, [selectedDate, eventsByDate]);

  const editableEvents = useMemo(() => {
    if (!isTrainer) return [];
    return selectedDateEvents.filter(e => 
      e.createdBy === currentUsername && 
      (e.type.toLowerCase().includes("musculação") || e.type.toLowerCase().includes("pilates"))
    );
  }, [selectedDateEvents, isTrainer, currentUsername]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    if (isTrainer) setShowAddTrainingModal(true);
    else setShowDayModal(true);
  };

  const handleAddTraining = () => {
    if (!selectedDate || !trainingType || !trainingTime) {
      toast?.error?.("Preencha campos.");
      return;
    }
    try {
      const dateStr = normalizeDateKey(selectedDate);
      const description = trainingDescription ? `${trainingDescription} ${trainingTime}` : `${trainingType} ${trainingTime}`;
      createEventMutation.mutate({ date: dateStr, type: trainingType, description, isShift: false });
    } catch (error) {
      console.error('[CalendarPage] Error in handleAddTraining:', error);
      toast.error("Erro ao salvar treino. Tente novamente.");
    }
  };

  const handleEditTrainingClick = (event: typeof editableEvents[0]) => {
    setEditingEvent(event);
    setTrainingType(event.type);
    const time = extractTimeFromDescription(event.description || "");
    setTrainingTime(time);
    setTrainingDescription((event.description || "").replace(event.type, "").replace(time, "").trim());
    setShowAddTrainingModal(false);
    setShowEditModal(true);
  };

  const handleUpdateTraining = () => {
    if (!editingEvent || !trainingType || !trainingTime) {
      toast?.error?.("Preencha campos.");
      return;
    }
    try {
      const description = trainingDescription ? `${trainingDescription} ${trainingTime}` : `${trainingType} ${trainingTime}`;
      updateEventMutation.mutate({ id: editingEvent.id, type: trainingType, description });
    } catch (error) {
      console.error('[CalendarPage] Error in handleUpdateTraining:', error);
      toast.error("Erro ao atualizar treino. Tente novamente.");
    }
  };

  const handleAddEvent = () => {
    if (!selectedDate || !eventType) {
      toast?.error?.("Selecione o tipo.");
      return;
    }
    const finalType = eventType === "Outro" ? customEventType : eventType;
    if (!finalType) {
      toast?.error?.("Digite o tipo.");
      return;
    }
    try {
      const dateStr = normalizeDateKey(selectedDate);
      let description = eventDescription || finalType;
      if (eventTime) description = `${description} ${eventTime}`;
      const isShift = ["hc", "zn", "noturno", "apoio", "corredor"].some(k => finalType.toLowerCase().includes(k));
      if (!isRecurring) {
        createEventMutation.mutate({ date: dateStr, type: finalType, description, isShift });
      } else {
        const datesToCreate = [];
        let current = new Date(dateStr + 'T12:00:00Z');
        const end = new Date(recurrenceEndDate + 'T12:00:00Z');
        const startDow = current.getDay();
        if (recurrenceType === 'weekly') {
          while (current <= end) {
            datesToCreate.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + (7 * recurrenceInterval));
          }
        } else if (recurrenceType === 'monthly') {
          let currMonth = new Date(current);
          currMonth.setDate(1);
          while (currMonth <= end) {
            let year = currMonth.getFullYear();
            let month = currMonth.getMonth();
            let d = new Date(Date.UTC(year, month, 1, 12, 0, 0));
            let occurrencesFound = 0;
            while (d.getMonth() === month && d <= end) {
              if (d.getDay() === startDow) {
                occurrencesFound++;
                if (monthlyOccurrences.includes(occurrencesFound) && d >= new Date(dateStr + 'T12:00:00Z')) {
                  datesToCreate.push(d.toISOString().split('T')[0]);
                }
              }
              d.setDate(d.getDate() + 1);
            }
            currMonth.setMonth(currMonth.getMonth() + recurrenceInterval);
          }
        }
        createManyMutation.mutate(datesToCreate.map(d => ({ date: d, type: finalType, description, isShift })));
      }
    } catch (error) {
      console.error('[CalendarPage] Error in handleAddEvent:', error);
      toast.error("Erro ao salvar evento. Tente novamente.");
    }
  };

  const handleEditEventClick = (event: typeof selectedDateEvents[0]) => {
    setEditingEvent({ ...event, date: normalizeDateKey(event.date) });
    setIsPassed(event.isPassed || false);
    const matchedType = EVENT_TYPES.find(t => event.type.toLowerCase().includes(t.value.toLowerCase().split(" ")[0]));
    if (matchedType) { setEventType(matchedType.value); setCustomEventType(""); } 
    else { setEventType("Outro"); setCustomEventType(event.type); }
    const time = extractTimeFromDescription(event.description || "");
    setEventTime(time);
    setEventDescription((event.description || "").replace(event.type, "").replace(time, "").trim());
    setShowDayModal(false);
    setShowEditModal(true);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent || !eventType) {
      toast?.error?.("Selecione o tipo.");
      return;
    }
    const finalType = eventType === "Outro" ? customEventType : eventType;
    if (!finalType) {
      toast?.error?.("Digite o tipo.");
      return;
    }
    let description = eventDescription || finalType;
    if (eventTime) description = `${description} ${eventTime}`;
    updateEventMutation.mutate({ id: editingEvent.id, type: finalType, description, isPassed });
  };

  const handleDeleteClick = (event: { id: number; type: string }) => {
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) deleteEventMutation.mutate({ id: eventToDelete.id });
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-2 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><CalendarIcon className="w-6 h-6" /> Calendário</h1>
          <p className="text-muted-foreground text-sm">{isTrainer ? "Adicione treinos." : "Gerencie eventos."}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-5 h-5" /></Button>
            <CardTitle className="text-lg font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => <div key={day} className="text-center text-xs font-bold text-muted-foreground uppercase py-2">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 auto-rows-fr">
            {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="min-h-[100px] bg-gray-50/50 dark:bg-gray-900/10 rounded-md" />)}
            {days.map(day => {
              const dateStr = normalizeDateKey(day);
              const dayEvents = eventsByDate.get(dateStr) || [];
              return (
                <button key={dateStr} onClick={() => handleDayClick(day)} className={`min-h-[140px] p-2 rounded-lg text-sm relative border transition-all flex flex-col items-start gap-1 group ${isToday(day) ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/30"} ${!isSameMonth(day, currentMonth) ? "opacity-40 bg-muted/20" : ""}`}>
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{format(day, "d")}</span>
                  <div className="w-full space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 6).map(e => <div key={e.id} className={`text-[10px] px-1.5 py-0.5 rounded-sm truncate w-full border-l-2 text-left font-medium ${getEventColor(e.type, e.isPassed)} ${e.isPassed ? "line-through opacity-60" : ""}`}>{getEventLabel(e)}</div>)}
                    {dayEvents.length > 6 && <div className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 6} mais</div>}
                  </div>
                  {/* Bloco Contabilizador de Horas ZN */}
                  {format(day, "d") === "19" && isAdmin && (
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="mt-auto mb-1 w-[95%] mx-auto bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-800 text-[10px] font-bold py-1 px-1 rounded shadow-sm text-center cursor-default z-10"
                    >
                      Total ZN: {calculateZNHours(allEvents, day)}h
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
              {isAdmin && <Button size="sm" onClick={() => { setShowDayModal(false); setShowAddEventModal(true); }} className="ml-4"><Plus className="w-4 h-4 mr-1" /> Novo Evento</Button>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {selectedDateEvents.length === 0 ? <p className="text-center text-muted-foreground py-8">Sem eventos.</p> : selectedDateEvents.map(event => (
              <div key={event.id} className={`p-3 rounded-md border ${getEventColor(event.type, event.isPassed)}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><span className="font-semibold">{event.type}</span><span className="text-xs font-mono">{extractTimeFromDescription(event.description || "")}</span></div>
                    {event.description && event.description !== event.type && <p className="text-sm mt-1 opacity-80">{event.description.replace(event.type, '').replace(extractTimeFromDescription(event.description || ""), '').trim()}</p>}
                  </div>
                  {isAdmin && <div className="flex gap-1 ml-2"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditEventClick(event)}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDeleteClick({ id: event.id, type: event.type })}><Trash2 className="w-4 h-4" /></Button></div>}
                </div>
              </div>
            ))}
            {isAdmin && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Diário do Dia</h4>
                  <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => { setShowDayModal(false); navigate(`/diario?date=${normalizeDateKey(selectedDate!)}`); }}>Abrir Diário Completo &rarr;</Button>
                </div>
                <div className="bg-muted/30 p-3 rounded-md text-sm text-muted-foreground italic min-h-[60px]">
                  {diaryEntry?.content ? (
                    <div>
                      {diaryEntry.title && <p className="font-semibold not-italic text-foreground mb-1">{diaryEntry.title}</p>}
                      <p className="line-clamp-3">"{diaryEntry.content.substring(0, 200)}..."</p>
                    </div>
                  ) : <span className="opacity-50">Nenhum registro.</span>}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Outros modais mantidos iguais (AddEvent, AddTraining, Edit, Delete) */}
      <Dialog open={showAddEventModal} onOpenChange={setShowAddEventModal}><DialogContent><DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Select value={eventType} onValueChange={setEventType}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>{eventType === "Outro" && <Input value={customEventType} onChange={e => setCustomEventType(e.target.value)} placeholder="Personalizado" />}<Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} /><Textarea value={eventDescription} onChange={e => setEventDescription(e.target.value)} placeholder="Obs" /><div className="border-t pt-4 mt-4"><label className="flex items-center space-x-2 font-medium cursor-pointer"><input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-4 h-4" /><span>Repetir este evento</span></label>{isRecurring && (<div className="mt-3 pl-4 border-l-2 space-y-3"><Select value={recurrenceType} onValueChange={(v: any) => setRecurrenceType(v)}><SelectTrigger><SelectValue placeholder="Frequencia" /></SelectTrigger><SelectContent><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="monthly">Mensal (Semanas Especificas)</SelectItem></SelectContent></Select>{recurrenceType === 'weekly' ? (<div className="flex items-center space-x-2 text-sm"><span>A cada</span><Input type="number" min="1" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(Number(e.target.value))} className="w-20 h-8" /><span>semana(s)</span></div>) : (<div className="text-sm space-y-1"><span>Ocorrera nas seguintes semanas do mes:</span><div className="flex gap-3 mt-1">{[1, 2, 3, 4, 5].map(num => (<label key={num} className="flex items-center space-x-1 cursor-pointer"><input type="checkbox" checked={monthlyOccurrences.includes(num)} onChange={(e) => {if (e.target.checked) setMonthlyOccurrences([...monthlyOccurrences, num]); else setMonthlyOccurrences(monthlyOccurrences.filter(n => n !== num));}} className="w-4 h-4" /><span>{num}o</span></label>))}</div></div>)}<div className="text-sm"><span className="block mb-1">Repetir ate a data:</span><Input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} /></div></div>)}</div></div><DialogFooter><Button onClick={handleAddEvent} disabled={createEventMutation.isPending || createEventMutation.isLoading || createManyMutation.isPending || createManyMutation.isLoading}>{createEventMutation.isPending || createManyMutation.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showAddTrainingModal} onOpenChange={setShowAddTrainingModal}><DialogContent><DialogHeader><DialogTitle>Novo Treino</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Select value={trainingType} onValueChange={setTrainingType}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="Musculação">Musculação</SelectItem><SelectItem value="Pilates">Pilates</SelectItem></SelectContent></Select><Input type="time" value={trainingTime} onChange={e => setTrainingTime(e.target.value)} /><Textarea value={trainingDescription} onChange={e => setTrainingDescription(e.target.value)} placeholder="Obs" /></div><DialogFooter><Button onClick={handleAddTraining} disabled={createEventMutation.isPending || createEventMutation.isLoading}>{createEventMutation.isPending || createEventMutation.isLoading ? "Salvando..." : "Salvar"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}><DialogContent><DialogHeader><DialogTitle>Editar</DialogTitle></DialogHeader><div className="space-y-4 py-4">{isAdmin ? <><Select value={eventType} onValueChange={setEventType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select><Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} /><Textarea value={eventDescription} onChange={e => setEventDescription(e.target.value)} /><div className="flex items-center space-x-2 mt-4"><input type="checkbox" id="is-passed" checked={isPassed} onChange={e => setIsPassed(e.target.checked)} className="w-4 h-4" /><Label htmlFor="is-passed">Marcar como Passado/Repassado</Label></div></> : <><Select value={trainingType} onValueChange={setTrainingType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Musculação">Musculação</SelectItem><SelectItem value="Pilates">Pilates</SelectItem></SelectContent></Select><Input type="time" value={trainingTime} onChange={e => setTrainingTime(e.target.value)} /><Textarea value={trainingDescription} onChange={e => setTrainingDescription(e.target.value)} /></>}</div><DialogFooter><Button onClick={isAdmin ? handleUpdateEvent : handleUpdateTraining}>Atualizar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}><DialogContent><DialogHeader><DialogTitle>Excluir?</DialogTitle></DialogHeader><DialogFooter><Button variant="destructive" onClick={confirmDelete}>Excluir</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}