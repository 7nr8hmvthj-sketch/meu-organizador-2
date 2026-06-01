import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { normalizeDateKey } from "@/lib/dateUtils";
import { getEventColor, getEventLabel, extractTimeFromDescription } from "@/lib/eventUtils";

// --- COMPONENT ---

export default function WeeklyCalendarPage() {
  // Começa no domingo da semana atual
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 0 }); // 0 = Domingo
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Estados do modal moderno (espelho do CalendarPage)
  const [eventType, setEventType] = useState<string>("");
  const [customEventType, setCustomEventType] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");
  const [workplaceId, setWorkplaceId] = useState<number | "">("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [isPassed, setIsPassed] = useState(false);
  const [eventColor, setEventColor] = useState<string>("default");
  const [eventValue, setEventValue] = useState<string>("");
  // Manter para compatibilidade com editableEvents (treinos da treinadora)
  const [trainingType, setTrainingType] = useState<string>("");
  const [trainingTime, setTrainingTime] = useState<string>("");
  const [trainingDescription, setTrainingDescription] = useState<string>("");
  
  const [editingEvent, setEditingEvent] = useState<{ id: number; type: string; description: string | null; createdBy?: string | null } | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{ id: number; type: string } | null>(null);

  const [showShiftDivider, setShowShiftDivider] = useState(false);
  const [doctorsCount, setDoctorsCount] = useState<number>(2);
  const [dividerStartTime, setDividerStartTime] = useState("01:00");
  const [dividerEndTime, setDividerEndTime] = useState("07:00");
  const [dividedShifts, setDividedShifts] = useState<string[]>([]);

  const { data: allEvents = [] } = trpc.events.list.useQuery();
  const { data: authData } = trpc.auth.checkSimpleAuth.useQuery();
  const { data: dbCategories = [] } = trpc.categories.list.useQuery();
  const { data: workplaces = [] } = trpc.workplaces.list.useQuery();
  const utils = trpc.useUtils();

  const currentUsername = authData?.user?.username;
  const isAdmin = authData?.user?.role === "admin";
  const isTrainer = currentUsername === "JESSICA" || currentUsername === "ISA";

  // Filtro de privacidade: oculta Lembretes de trainers
  const events = useMemo(() => {
    return allEvents.filter(event => {
      if (event.type === "Lembrete" && !isAdmin) return false;
      return true;
    });
  }, [allEvents, isAdmin]);

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast?.success?.("Treino adicionado!");
      utils?.events?.list?.invalidate?.();
      setShowAddTrainingModal?.(false);
      resetForm?.();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      toast?.success?.("Treino atualizado!");
      utils?.events?.list?.invalidate?.();
      setShowEditModal?.(false);
      setEditingEvent?.(null);
      resetForm?.();
    },
    onError: (error) => toast?.error?.(`Erro: ${error?.message}`),
  });

  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast?.success?.("Treino excluído!");
      utils?.events?.list?.invalidate?.();
      setShowDeleteConfirm?.(false);
      setEventToDelete?.(null);
    },
    onError: (error) => toast?.error?.(`Erro: ${error?.message}`),
  });

  // Tipos globais fixos (sempre visíveis para todos)
  const GLOBAL_EVENT_TYPES = [
    { value: "Porta", label: "Porta" },
    { value: "Observação", label: "Observação" },
    { value: "Enfermaria", label: "Enfermaria" },
    { value: "Sala de Emergência", label: "Sala de Emergência" },
    { value: "Home Care", label: "Home Care" },
    { value: "Personalizado", label: "Personalizado" },
  ];

  const EVENT_TYPES = useMemo(() => {
    const types = [...GLOBAL_EVENT_TYPES];
    const globalNames = GLOBAL_EVENT_TYPES.map(g => g.value.toLowerCase());
    dbCategories.forEach((cat: any) => {
      const catUserId = cat.userId ?? cat.userid;
      if (catUserId && !globalNames.includes(cat.name.toLowerCase())) {
        types.unshift({ value: cat.name, label: cat.name });
      }
    });
    return types;
  }, [dbCategories]);

  const resetForm = () => {
    setEventType("");
    setCustomEventType("");
    setEventDescription("");
    setWorkplaceId("");
    setStartTime("");
    setEndTime("");
    setIsPassed(false);
    setEventColor("default");
    setEventValue("");
    setTrainingType("");
    setTrainingTime("");
    setTrainingDescription("");
  };

  const calculateDivision = () => {
    if (!dividerStartTime || !dividerEndTime) {
      toast.error("Preencha os horários");
      return;
    }
    const [startH, startM] = dividerStartTime.split(':').map(Number);
    const [endH, endM] = dividerEndTime.split(':').map(Number);

    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;

    if (endTotal <= startTotal) endTotal += 24 * 60;

    const diff = endTotal - startTotal;
    const slice = Math.floor(diff / doctorsCount);

    const result: string[] = [];
    let current = startTotal;
    for (let i = 0; i < doctorsCount; i++) {
      const next = current + slice;
      const sh = Math.floor((current % (24 * 60)) / 60).toString().padStart(2, '0');
      const sm = (current % 60).toString().padStart(2, '0');
      const eh = Math.floor((next % (24 * 60)) / 60).toString().padStart(2, '0');
      const em = (next % 60).toString().padStart(2, '0');

      const durationH = Math.floor(slice / 60);
      const durationM = slice % 60;
      const durationStr = durationM > 0 ? `${durationH}h${durationM}m` : `${durationH}h`;

      result.push(`Médico ${i + 1}: ${sh}:${sm} às ${eh}:${em} (${durationStr})`);
      current = next;
    }
    setDividedShifts(result);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(dividedShifts.join('\n'));
    toast.success("Copiado para a área de transferência!");
  };

  // Gera os 7 dias da semana (domingo a sábado)
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) { // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sáb
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  }, [currentWeekStart]);

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
    return selectedDateEvents.filter(e => 
      e.createdBy === currentUsername && 
      (e.type.toLowerCase().includes("musculação") || 
       e.type.toLowerCase().includes("musculacao") || 
       e.type.toLowerCase().includes("pilates"))
    );
  }, [selectedDateEvents, currentUsername]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setShowAddTrainingModal(true);
  };

  const handleAddEvent = () => {
    if (!selectedDate || !eventType) {
      toast.error("Selecione uma data e tipo de evento");
      return;
    }
    const type = eventType === "Personalizado" ? customEventType : eventType;
    if (!type.trim()) {
      toast.error("Digite o tipo de evento personalizado");
      return;
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setShowAddTrainingModal(false);
    createEventMutation.mutate({
      date: dateStr,
      type,
      description: eventDescription || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      color: eventColor !== "default" ? eventColor : undefined,
      isShift: false,
      workplaceId: workplaceId ? Number(workplaceId) : undefined,
      value: eventValue ? Number(eventValue) : undefined,
    });
    resetForm();
  };

  const handleEditClick = (event: typeof editableEvents[0]) => {
    setEditingEvent(event);
    // Preencher estados modernos
    setEventType(event.type);
    setEventDescription(event.description || "");
    // Compatibilidade legada
    setTrainingType(event.type);
    const time = extractTimeFromDescription(event.description || "");
    setTrainingTime(time);
    const desc = (event.description || "").replace(event.type, "").replace(time, "").trim();
    setTrainingDescription(desc);
    setShowAddTrainingModal(false);
    setShowEditModal(true);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent || !eventType) {
      toast.error("Selecione o tipo de evento.");
      return;
    }
    const type = eventType === "Personalizado" ? customEventType : eventType;
    if (!type.trim()) {
      toast.error("Digite o tipo de evento personalizado");
      return;
    }
    updateEventMutation.mutate({
      id: editingEvent.id,
      type,
      description: eventDescription || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    });
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
      : trainingTime;

    updateEventMutation.mutate({
      id: editingEvent.id,
      type: trainingType,
      description: description,
    });
  };

  const handleDeleteClick = (event: typeof editableEvents[0]) => {
    setEventToDelete({ id: event.id, type: event.type });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate({ id: eventToDelete.id });
    }
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  // Formata o período da semana para exibição
  const weekPeriod = useMemo(() => {
    const endOfWeekDate = addDays(currentWeekStart, 6); // Sábado
    const startMonth = format(currentWeekStart, "MMM", { locale: ptBR });
    const endMonth = format(endOfWeekDate, "MMM", { locale: ptBR });
    
    if (startMonth === endMonth) {
      return `${format(currentWeekStart, "d")} - ${format(endOfWeekDate, "d")} ${startMonth}`;
    }
    return `${format(currentWeekStart, "d MMM", { locale: ptBR })} - ${format(endOfWeekDate, "d MMM", { locale: ptBR })}`;
  }, [currentWeekStart]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Agenda Semanal</h1>
          <p className="text-muted-foreground text-xs">Toque em um dia para adicionar treino</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowShiftDivider(true); setDividedShifts([]); }} title="Divisor de Plantões">
            <span className="font-bold">÷ Horas</span>
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Navegação da Semana */}
      <Card className="shadow-sm">
        <CardContent className="py-3 px-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm font-semibold capitalize">{weekPeriod}</span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de dias da semana - 2 colunas x 3 linhas */}
      <div className="grid grid-cols-2 gap-3">
        {weekDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateStr) || [];
          const isCurrentDay = isToday(day);
          
          return (
            <Card 
              key={dateStr}
              className={`cursor-pointer transition-all hover:shadow-md ${isCurrentDay ? "ring-2 ring-primary" : ""}`}
              onClick={() => handleDayClick(day)}
            >
              <CardContent className="p-3">
                {/* Header do dia */}
                <div className={`flex items-center justify-between mb-2 pb-2 border-b ${isCurrentDay ? "border-primary/30" : "border-border"}`}>
                  <span className={`text-xs font-bold uppercase ${isCurrentDay ? "text-primary" : "text-muted-foreground"}`}>
                    {dayNames[index]}
                  </span>
                  <span className={`text-lg font-bold ${isCurrentDay ? "bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center" : "text-foreground"}`}>
                    {format(day, "d")}
                  </span>
                </div>
                
                {/* Eventos do dia */}
                <div className="space-y-1.5 min-h-[80px]">
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 text-center py-4">Sem eventos</p>
                  ) : (
                    dayEvents.slice(0, 4).map((e) => {
                      // Determinar cor do indicador usando classes padrão do tailwind baseado no getEventColor
                      const getIndicatorColor = () => {
                        if (e.isPassed) return 'bg-gray-400';
                        const typeLower = e.type.toLowerCase();
                        if (typeLower.includes('natação') || typeLower.includes('natacao')) return 'bg-blue-500';
                        if (typeLower.includes('musculação') || typeLower.includes('musculacao')) return 'bg-green-500';
                        if (typeLower.includes('pilates')) return 'bg-purple-500';
                        if (typeLower.includes('hc') || typeLower.includes('enfermaria')) return 'bg-red-500';
                        if (typeLower.includes('zn') || typeLower.includes('zona norte') || typeLower.includes('porta')) return 'bg-amber-500';
                        if (typeLower.includes('sala')) return 'bg-orange-500';
                        if (typeLower.includes('noturno')) return 'bg-indigo-500';
                        if (typeLower.includes('apoio')) return 'bg-pink-500';
                        if (typeLower.includes('home care')) return 'bg-teal-500';
                        if (typeLower.includes('observação')) return 'bg-cyan-500';
                        return 'bg-gray-400';
                      };
                      
                      return (
                        <div 
                          key={e.id} 
                          className={`text-xs px-2 py-1 rounded border-l-3 ${getEventColor(e.type, e.isPassed)} ${e.isPassed ? "line-through opacity-60" : ""}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getIndicatorColor()}`}></div>
                            <span className="truncate font-medium">{getEventLabel(e)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {dayEvents.length > 4 && (
                    <p className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 4} mais</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legenda compacta */}
      <Card>
        <CardContent className="py-2 px-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Natação</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Musculação</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span>Pilates</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>HC</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span>ZN</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal para adicionar treino */}
      <Dialog open={showAddTrainingModal} onOpenChange={setShowAddTrainingModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          
          {/* Mostrar eventos existentes no dia */}
          {selectedDateEvents.length > 0 && (
            <div className="bg-muted/50 rounded-md p-3 mb-2 max-h-[30vh] overflow-y-auto">
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
                  
                  // Determinar cor do indicador
                  const getIndicatorColor = () => {
                    if (e.isPassed) return 'bg-gray-400';
                    const typeLower = e.type.toLowerCase();
                    if (typeLower.includes('natação') || typeLower.includes('natacao')) return 'bg-blue-500';
                    if (typeLower.includes('musculação') || typeLower.includes('musculacao')) return 'bg-green-500';
                    if (typeLower.includes('pilates')) return 'bg-purple-500';
                    if (typeLower.includes('hc') || typeLower.includes('enfermaria')) return 'bg-red-500';
                    if (typeLower.includes('zn') || typeLower.includes('zona norte') || typeLower.includes('porta')) return 'bg-amber-500';
                    if (typeLower.includes('sala')) return 'bg-orange-500';
                    if (typeLower.includes('noturno')) return 'bg-indigo-500';
                    if (typeLower.includes('apoio')) return 'bg-pink-500';
                    if (typeLower.includes('home care')) return 'bg-teal-500';
                    if (typeLower.includes('observação')) return 'bg-cyan-500';
                    return 'bg-gray-400';
                  };
                  
                  return (
                    <div key={e.id} className={`text-xs ${e.isPassed ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getIndicatorColor()}`}></div>
                        {e.startTime && <span className="font-extrabold mr-0.5">{e.startTime}</span>}
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
              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Seus treinos:</p>
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
                        <div className="flex items-center gap-2">
                          {e.startTime && <span className="font-extrabold">{e.startTime}</span>}
                          <span className="font-medium">{getEventLabel(e)}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={(ev) => { ev.stopPropagation(); handleEditClick(e); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                            onClick={(ev) => { ev.stopPropagation(); handleDeleteClick(e); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-2 flex-1">
            <div>
              <Label>Tipo de Evento</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {eventType === "Personalizado" && (
              <div>
                <Label>Nome Personalizado</Label>
                <Input
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.target.value)}
                  placeholder="Ex: Pilates"
                />
              </div>
            )}

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Adicione detalhes..."
                rows={2}
              />
            </div>

            {/* Local de Trabalho — oculto para trainers (eventos delas são treinos, não plantões) */}
            {!isTrainer && (
              <div>
                <Label>Local de Trabalho (opcional)</Label>
                <Select
                  value={workplaceId ? String(workplaceId) : ""}
                  onValueChange={(val) => setWorkplaceId(val ? Number(val) : "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    {workplaces.map((wp: any) => (
                      <SelectItem key={wp.id} value={String(wp.id)}>
                        {wp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Horário com botões rápidos */}
            <div className="space-y-3 w-full">
              <div className="w-full">
                <label className="text-xs text-muted-foreground mb-2 block font-medium">Horários Rápidos (Plantões)</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("07:00"); setEndTime("13:00"); }}>7-13</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("13:00"); setEndTime("19:00"); }}>13-19</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("19:00"); setEndTime("01:00"); }}>19-01</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("19:00"); setEndTime("07:00"); }}>19-07</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setStartTime(""); setEndTime(""); }}>Limpar</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full border-t pt-3">
                <div className="w-full">
                  <label className="text-xs text-muted-foreground mb-1 block">Início Manual</label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full" />
                </div>
                <div className="w-full">
                  <label className="text-xs text-muted-foreground mb-1 block">Fim Manual</label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowAddTrainingModal(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleAddEvent} disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edição */}
      <Dialog open={showEditModal} onOpenChange={(open) => { setShowEditModal(open); if (!open) { setEditingEvent(null); resetForm(); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-2 flex-1">
            <div>
              <Label>Tipo de Evento</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {eventType === "Personalizado" && (
              <div>
                <Label>Nome Personalizado</Label>
                <Input
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Adicione detalhes..."
                rows={2}
              />
            </div>

            {/* Horário com botões rápidos */}
            <div className="space-y-3 w-full">
              <div className="w-full">
                <label className="text-xs text-muted-foreground mb-2 block font-medium">Horários Rápidos (Plantões)</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("07:00"); setEndTime("13:00"); }}>7-13</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("13:00"); setEndTime("19:00"); }}>13-19</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("19:00"); setEndTime("01:00"); }}>19-01</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("19:00"); setEndTime("07:00"); }}>19-07</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setStartTime(""); setEndTime(""); }}>Limpar</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full border-t pt-3">
                <div className="w-full">
                  <label className="text-xs text-muted-foreground mb-1 block">Início Manual</label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full" />
                </div>
                <div className="w-full">
                  <label className="text-xs text-muted-foreground mb-1 block">Fim Manual</label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingEvent(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateEvent} disabled={updateEventMutation.isPending}>
              {updateEventMutation.isPending ? "Salvando..." : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Tem certeza que deseja excluir o treino <strong>{eventToDelete?.type}</strong>?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setEventToDelete(null); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteEventMutation.isPending}>
              {deleteEventMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showShiftDivider} onOpenChange={setShowShiftDivider}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Divisor de Plantões</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Número de Médicos</Label>
              <Input type="number" min="2" max="10" value={doctorsCount} onChange={e => setDoctorsCount(Number(e.target.value))} />
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label>Horário Início</Label>
                <Input type="time" value={dividerStartTime} onChange={e => setDividerStartTime(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label>Horário Fim</Label>
                <Input type="time" value={dividerEndTime} onChange={e => setDividerEndTime(e.target.value)} />
              </div>
            </div>
            <Button onClick={calculateDivision} className="w-full">Calcular Divisão</Button>

            {dividedShifts.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-md space-y-2">
                <h4 className="font-semibold text-sm">Resultado:</h4>
                {dividedShifts.map((shift, idx) => (
                  <div key={idx} className="text-sm font-mono">{shift}</div>
                ))}
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="w-full mt-2">Copiar para WhatsApp</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
