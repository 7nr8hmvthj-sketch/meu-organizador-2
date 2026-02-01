import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil, Trash2, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// --- HELPERS ---

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

// Tipos de eventos disponíveis para o admin criar
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
  if (typeLower.includes("natação") || typeLower.includes("natacao")) label = "Natação";
  else if (typeLower.includes("musculação") || typeLower.includes("musculacao")) label = "Musculação";
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
  
  if (timeStr && !label.includes(timeStr)) {
    return `${label} ${timeStr}`;
  }
  
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  
  // Estados para treinos (treinadoras)
  const [trainingType, setTrainingType] = useState<string>("");
  const [trainingTime, setTrainingTime] = useState<string>("");
  const [trainingDescription, setTrainingDescription] = useState<string>("");
  
  // Estados para eventos (admin)
  const [eventType, setEventType] = useState<string>("");
  const [customEventType, setCustomEventType] = useState<string>("");
  const [eventTime, setEventTime] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");
  
  // Estado para edição
  const [editingEvent, setEditingEvent] = useState<{ id: number; type: string; description: string | null; createdBy?: string | null; date?: string } | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{ id: number; type: string } | null>(null);

  const { data: events = [] } = trpc.events.list.useQuery();
  const { data: authData } = trpc.auth.checkSimpleAuth.useQuery();
  const utils = trpc.useUtils();

  const isTrainer = authData?.user?.role === "trainer";
  const isAdmin = authData?.user?.role === "admin";
  const currentUsername = authData?.user?.username;

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Evento adicionado com sucesso!");
      utils.events.list.invalidate();
      setShowAddTrainingModal(false);
      setShowAddEventModal(false);
      resetForm();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso!");
      utils.events.list.invalidate();
      setShowEditModal(false);
      setEditingEvent(null);
      resetForm();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Evento excluído com sucesso!");
      utils.events.list.invalidate();
      setShowDeleteConfirm(false);
      setEventToDelete(null);
      setShowDayModal(false);
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const resetForm = () => {
    setTrainingType("");
    setTrainingTime("");
    setTrainingDescription("");
    setEventType("");
    setCustomEventType("");
    setEventTime("");
    setEventDescription("");
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

  // Filtra apenas treinos que a treinadora pode editar/excluir
  const editableEvents = useMemo(() => {
    if (!isTrainer) return [];
    return selectedDateEvents.filter(e => 
      e.createdBy === currentUsername && 
      (e.type.toLowerCase().includes("musculação") || 
       e.type.toLowerCase().includes("musculacao") || 
       e.type.toLowerCase().includes("pilates"))
    );
  }, [selectedDateEvents, isTrainer, currentUsername]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    if (isTrainer) setShowAddTrainingModal(true);
    else setShowDayModal(true);
  };

  // --- Handlers para Treinadoras ---
  const handleAddTraining = () => {
    if (!selectedDate || !trainingType || !trainingTime) {
      toast.error("Preencha tipo e horário.");
      return;
    }
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

  const handleEditTrainingClick = (event: typeof editableEvents[0]) => {
    setEditingEvent(event);
    setTrainingType(event.type);
    const time = extractTimeFromDescription(event.description || "");
    setTrainingTime(time);
    const desc = (event.description || "").replace(event.type, "").replace(time, "").trim();
    setTrainingDescription(desc);
    setShowAddTrainingModal(false);
    setShowEditModal(true);
  };

  const handleUpdateTraining = () => {
    if (!editingEvent || !trainingType || !trainingTime) {
      toast.error("Preencha tipo e horário.");
      return;
    }
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trainingTime)) {
      toast.error("Horário inválido. Use formato HH:MM.");
      return;
    }

    const description = trainingDescription 
      ? `${trainingDescription} ${trainingTime}`
      : `${trainingType} ${trainingTime}`;

    updateEventMutation.mutate({
      id: editingEvent.id,
      type: trainingType,
      description: description,
    });
  };

  // --- Handlers para Admin ---
  const handleAddEvent = () => {
    if (!selectedDate || !eventType) {
      toast.error("Selecione o tipo de evento.");
      return;
    }

    const finalType = eventType === "Outro" ? customEventType : eventType;
    if (!finalType) {
      toast.error("Digite o tipo de evento personalizado.");
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    let description = eventDescription || finalType;
    
    // Se tiver horário específico, adiciona à descrição
    if (eventTime) {
      description = `${description} ${eventTime}`;
    }

    createEventMutation.mutate({
      date: dateStr,
      type: finalType,
      description: description,
      isShift: finalType.toLowerCase().includes("hc") || 
               finalType.toLowerCase().includes("zn") || 
               finalType.toLowerCase().includes("noturno") ||
               finalType.toLowerCase().includes("apoio") ||
               finalType.toLowerCase().includes("corredor"),
    });
  };

  const handleEditEventClick = (event: typeof selectedDateEvents[0]) => {
    setEditingEvent({
      id: event.id,
      type: event.type,
      description: event.description,
      createdBy: event.createdBy,
      date: normalizeDateKey(event.date),
    });
    
    // Tenta encontrar o tipo na lista de tipos pré-definidos
    const matchedType = EVENT_TYPES.find(t => 
      event.type.toLowerCase().includes(t.value.toLowerCase().split(" ")[0])
    );
    
    if (matchedType) {
      setEventType(matchedType.value);
      setCustomEventType("");
    } else {
      setEventType("Outro");
      setCustomEventType(event.type);
    }
    
    const time = extractTimeFromDescription(event.description || "");
    setEventTime(time);
    
    // Remove tipo e horário da descrição para obter apenas a observação
    let desc = event.description || "";
    desc = desc.replace(event.type, "").replace(time, "").trim();
    setEventDescription(desc);
    
    setShowDayModal(false);
    setShowEditModal(true);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent || !eventType) {
      toast.error("Selecione o tipo de evento.");
      return;
    }

    const finalType = eventType === "Outro" ? customEventType : eventType;
    if (!finalType) {
      toast.error("Digite o tipo de evento personalizado.");
      return;
    }

    let description = eventDescription || finalType;
    if (eventTime) {
      description = `${description} ${eventTime}`;
    }

    updateEventMutation.mutate({
      id: editingEvent.id,
      type: finalType,
      description: description,
    });
  };

  const handleDeleteClick = (event: { id: number; type: string }) => {
    setEventToDelete({ id: event.id, type: event.type });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate({ id: eventToDelete.id });
    }
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <CalendarIcon className="w-6 h-6" /> Calendário
          </h1>
          <p className="text-muted-foreground text-sm">
            {isTrainer ? "Clique em um dia para adicionar treino." : "Clique em um dia para ver e editar eventos."}
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

      {/* Modal para visualizar e editar eventos do dia (usuário admin) */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
              {isAdmin && (
                <Button 
                  size="sm" 
                  onClick={() => { setShowDayModal(false); setShowAddEventModal(true); }}
                  className="ml-4"
                >
                  <Plus className="w-4 h-4 mr-1" /> Novo Evento
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {selectedDateEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem eventos neste dia.</p>
            ) : (
              selectedDateEvents.map(event => (
                <div key={event.id} className={`p-3 rounded-md border ${getEventColor(event.type, event.isPassed)}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{event.type}</span>
                        <span className="text-xs font-mono">{extractTimeFromDescription(event.description || "")}</span>
                      </div>
                      {event.description && event.description !== event.type && (
                        <p className="text-sm mt-1 opacity-80">
                          {event.description.replace(event.type, '').replace(extractTimeFromDescription(event.description || ""), '').trim()}
                        </p>
                      )}
                      {event.isPassed && event.passedReason && (
                        <p className="text-xs mt-2 text-yellow-600 dark:text-yellow-400 italic">
                          Passado: {event.passedReason}
                        </p>
                      )}
                      {event.createdBy && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          Criado por: {event.createdBy}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 ml-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEditEventClick(event)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteClick({ id: event.id, type: event.type })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para adicionar evento (admin) */}
      <Dialog open={showAddEventModal} onOpenChange={(open) => { setShowAddEventModal(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Evento: {selectedDate && format(selectedDate, "dd/MM/yyyy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Evento *</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {eventType === "Outro" && (
              <div className="space-y-2">
                <Label>Tipo Personalizado *</Label>
                <Input 
                  value={customEventType} 
                  onChange={(e) => setCustomEventType(e.target.value)}
                  placeholder="Ex: Consulta médica, Reunião..."
                />
              </div>
            )}
            
            {(eventType === "Natação" || eventType === "Musculação" || eventType === "Pilates" || eventType === "Outro") && (
              <div className="space-y-2">
                <Label>Horário (opcional)</Label>
                <Input 
                  type="time" 
                  value={eventTime} 
                  onChange={(e) => setEventTime(e.target.value)} 
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea 
                value={eventDescription} 
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Detalhes adicionais sobre o evento..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddEventModal(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleAddEvent} disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
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
              <div className="space-y-2">
                {selectedDateEvents.map(e => {
                  const isTraining = e.type.toLowerCase().includes('musculação') || 
                                     e.type.toLowerCase().includes('musculacao') || 
                                     e.type.toLowerCase().includes('pilates');
                  const time = extractTimeFromDescription(e.description || "");
                  const descWithoutTypeAndTime = (e.description || "")
                    .replace(e.type, '')
                    .replace(time, '')
                    .trim();
                  
                  // Determinar cor do indicador baseado no tipo
                  const getIndicatorColor = () => {
                    if (e.isPassed) return 'bg-gray-400';
                    const typeLower = e.type.toLowerCase();
                    if (typeLower.includes('natação') || typeLower.includes('natacao')) return 'bg-blue-500';
                    if (typeLower.includes('musculação') || typeLower.includes('musculacao')) return 'bg-green-500';
                    if (typeLower.includes('pilates')) return 'bg-purple-500';
                    if (typeLower.includes('hc')) return 'bg-red-500';
                    if (typeLower.includes('zn') || typeLower.includes('zona norte')) return 'bg-amber-500';
                    if (typeLower.includes('noturno')) return 'bg-indigo-500';
                    if (typeLower.includes('apoio')) return 'bg-pink-500';
                    return 'bg-gray-400';
                  };
                  
                  return (
                    <div key={e.id} className={`text-xs ${e.isPassed ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getIndicatorColor()}`}></div>
                        <span className={`font-medium ${e.isPassed ? 'line-through text-gray-500' : ''}`}>{getEventLabel(e)}</span>
                        {isTraining && e.createdBy && (
                          <span className="text-muted-foreground">({e.createdBy})</span>
                        )}
                      </div>
                      {isTraining && descWithoutTypeAndTime && (
                        <p className="ml-4 text-muted-foreground italic">{descWithoutTypeAndTime}</p>
                      )}
                      {e.isPassed && e.passedReason && (
                        <p className="ml-4 text-xs text-yellow-600 dark:text-yellow-400 italic">Passado: {e.passedReason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Treinos editáveis pela treinadora */}
          {editableEvents.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-3 mb-2 border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Seus treinos (clique para editar/excluir):</p>
              <div className="space-y-2">
                {editableEvents.map(e => {
                  const time = extractTimeFromDescription(e.description || "");
                  const descWithoutTypeAndTime = (e.description || "")
                    .replace(e.type, '')
                    .replace(time, '')
                    .trim();
                  
                  return (
                    <div key={e.id} className="text-xs bg-white dark:bg-gray-800 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getEventLabel(e)}</span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={(ev) => { ev.stopPropagation(); handleEditTrainingClick(e); }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-500 hover:text-red-700"
                            onClick={(ev) => { ev.stopPropagation(); handleDeleteClick({ id: e.id, type: e.type }); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {descWithoutTypeAndTime && (
                        <p className="text-muted-foreground italic mt-1">{descWithoutTypeAndTime}</p>
                      )}
                    </div>
                  );
                })}
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
            <Button variant="outline" onClick={() => { setShowAddTrainingModal(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleAddTraining} disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edição (para admin e treinadoras) */}
      <Dialog open={showEditModal} onOpenChange={(open) => { setShowEditModal(open); if (!open) { setEditingEvent(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAdmin ? "Editar Evento" : "Editar Treino"}</DialogTitle>
          </DialogHeader>
          
          {isAdmin ? (
            // Formulário de edição para Admin
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Evento *</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {eventType === "Outro" && (
                <div className="space-y-2">
                  <Label>Tipo Personalizado *</Label>
                  <Input 
                    value={customEventType} 
                    onChange={(e) => setCustomEventType(e.target.value)}
                    placeholder="Ex: Consulta médica, Reunião..."
                  />
                </div>
              )}
              
              {(eventType === "Natação" || eventType === "Musculação" || eventType === "Pilates" || eventType === "Outro") && (
                <div className="space-y-2">
                  <Label>Horário (opcional)</Label>
                  <Input 
                    type="time" 
                    value={eventTime} 
                    onChange={(e) => setEventTime(e.target.value)} 
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Textarea 
                  value={eventDescription} 
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Detalhes adicionais sobre o evento..."
                  rows={2}
                />
              </div>
            </div>
          ) : (
            // Formulário de edição para Treinadoras
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
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingEvent(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button 
              onClick={isAdmin ? handleUpdateEvent : handleUpdateTraining} 
              disabled={updateEventMutation.isPending}
            >
              {updateEventMutation.isPending ? "Salvando..." : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Tem certeza que deseja excluir o evento <strong>{eventToDelete?.type}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setEventToDelete(null); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteEventMutation.isPending}>
              {deleteEventMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
