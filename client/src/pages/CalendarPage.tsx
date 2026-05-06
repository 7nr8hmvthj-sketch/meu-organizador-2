import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil, Trash2, Plus, BookOpen, Tags, Filter, Briefcase, Heart, LayoutGrid, DollarSign, TrendingUp, ChevronDown, ChevronUp, Clock, FileSpreadsheet, Building, Circle } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import CategoryManager from "./CategoryManager";
import WorkplaceManager from "../components/WorkplaceManager";
import { UnlinkedRateManager } from "../components/UnlinkedRateManager";
import FinancialDashboard from "../components/FinancialDashboard";
import CsvManager from "@/components/CsvManager";
import { MobileCalendar } from "@/components/MobileCalendar";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { normalizeDateKey } from "@/lib/dateUtils";
import { getEventColor, getEventLabel, extractTimeFromDescription, SHIFT_HOURS } from "@/lib/eventUtils";

// Tipos globais fixos (sempre visíveis para todos)
const GLOBAL_EVENT_TYPES = [
  { value: "Porta", label: "Porta" },
  { value: "Observação", label: "Observação" },
  { value: "Enfermaria", label: "Enfermaria" },
  { value: "Sala de Emergência", label: "Sala de Emergência" },
  { value: "Home Care", label: "Home Care" },
  { value: "Personalizado", label: "Personalizado" },
];

// --- CALCULADOR DE HORAS ZN (Dia 20 ao 19) - Apenas para exibição no dia 19 ---
function calculateZNHours(events: any[], targetDate: Date): number {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  
  // O ciclo vai do dia 20 do mês ANTERIOR até o dia 19 do mês ATUAL
  let startYear = targetYear;
  let startMonth = targetMonth - 1;
  if (startMonth < 0) {
    startMonth = 11;
    startYear--;
  }

  const startDateStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-20`;
  const endDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-19`;
  
  let totalHours = 0;
  
  events.forEach(event => {
    if (event.isPassed) return; 
    
    // Normalizando a string do evento de forma segura (YYYY-MM-DD)
    const eventDateStr = typeof event.date === 'string' ? event.date.substring(0, 10) : new Date(event.date).toISOString().substring(0, 10);
    
    if (eventDateStr >= startDateStr && eventDateStr <= endDateStr) {
      const type = (event.type || "").toLowerCase();
      const desc = (event.description || "").toLowerCase();
      const fullText = `${type} ${desc}`;
      
      if (fullText.includes("hc") || fullText.includes("home care") || fullText.includes("lembrete")) return;
      
      if (
        fullText.includes("zn") || 
        fullText.includes("zona norte") || 
        fullText.includes("noturno") || 
        fullText.includes("apoio") || 
        fullText.includes("observação") || 
        fullText.includes("observacao")
      ) {
        let timeMatch = fullText.match(/(\d{1,2})-(\d{1,2})/);
        if (!timeMatch && SHIFT_HOURS[type]) {
          timeMatch = SHIFT_HOURS[type].match(/(\d{1,2})-(\d{1,2})/);
        }
        if (timeMatch) {
          const startHour = parseInt(timeMatch[1], 10);
          const endHour = parseInt(timeMatch[2], 10);
          let diff = endHour - startHour;
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
  
  const [deleteMode, setDeleteMode] = useState<'single' | 'future' | 'all'>('single');

  const [trainingType, setTrainingType] = useState<string>("");
  const [trainingTime, setTrainingTime] = useState<string>("");
  const [trainingDescription, setTrainingDescription] = useState<string>("");
  
  const [eventType, setEventType] = useState<string>("");
  const [customEventType, setCustomEventType] = useState<string>("");
  const [eventTime, setEventTime] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");
  
  // Adições de Estado para Workplace
  const [workplaceId, setWorkplaceId] = useState<number | "">("");
  
  const [editingEvent, setEditingEvent] = useState<{ id: number; type: string; description: string | null; createdBy?: string | null; date?: string; isPassed?: boolean; workplaceId?: number | null } | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{ id: number; type: string } | null>(null);
  const [isPassed, setIsPassed] = useState(false);
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"weekly" | "monthly">("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [monthlyOccurrences, setMonthlyOccurrences] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("2026-12-31");
  
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [eventColor, setEventColor] = useState<string>("default");
  const [viewMode, setViewMode] = useState<'text' | 'dots'>('text');
  
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showWorkplaceManager, setShowWorkplaceManager] = useState(false);
  const [showUnlinkedManager, setShowUnlinkedManager] = useState(false);
  const [showCsvManager, setShowCsvManager] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);

  type CalendarFilter = "todos" | "plantoes" | "pessoal";
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>("todos");

  const resetForm = () => {
    setEventType("");
    setCustomEventType("");
    setEventTime("");
    setStartTime("");
    setEndTime("");
    setEventColor("default");
    setEventDescription("");
    setWorkplaceId("");
    setIsRecurring(false);
    setEditingEvent(null);
    setTrainingType("");
    setTrainingTime("");
    setTrainingDescription("");
  };

  const { data: dbCategories = [] } = trpc.categories.list.useQuery();
  const { data: workplaces = [] } = trpc.workplaces.list.useQuery();
  const addCustomCategoryMutation = trpc.categories.addCustom.useMutation({
    onSuccess: () => {
      utils?.categories?.list?.invalidate?.();
    },
  });

  const EVENT_TYPES = useMemo(() => {
    const types = [...GLOBAL_EVENT_TYPES];
    const globalNames = GLOBAL_EVENT_TYPES.map(g => g.value.toLowerCase());
    dbCategories.forEach((cat: any) => {
      const catUserId = cat.userId ?? cat.userid;
      if (catUserId && !globalNames.includes(cat.name.toLowerCase())) {
        const persoIdx = types.findIndex(t => t.value === "Personalizado");
        if (persoIdx >= 0) {
          types.splice(persoIdx, 0, { value: cat.name, label: cat.name });
        } else {
          types.push({ value: cat.name, label: cat.name });
        }
      }
    });
    return types;
  }, [dbCategories]);

  const PREDEFINED_COLORS = useMemo(() => {
    return [
      { name: "Padrão Automático", value: "default" },
      { name: "Vermelho (HC/Enfermaria)", value: "text-red-700 bg-red-50 dark:bg-red-900/30 border-red-200" },
      { name: "Laranja (ZN/Porta)", value: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 border-amber-200" },
      { name: "Amarelo", value: "text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200" },
      { name: "Azul", value: "text-blue-700 bg-blue-50 dark:bg-blue-900/30 border-blue-200" },
      { name: "Verde", value: "text-green-700 bg-green-50 dark:bg-green-900/30 border-green-200" },
      { name: "Roxo", value: "text-purple-700 bg-purple-50 dark:bg-purple-900/30 border-purple-200" },
      { name: "Rosa", value: "text-pink-700 bg-pink-50 dark:bg-pink-900/30 border-pink-200" },
      { name: "Turquesa", value: "text-teal-700 bg-teal-50 dark:bg-teal-900/30 border-teal-200" },
      { name: "Cinza", value: "text-gray-700 bg-gray-100 dark:bg-gray-800/30 border-gray-300" },
      { name: "Laranja (Sala)", value: "text-orange-700 bg-orange-50 dark:bg-orange-900/30 border-orange-200" },
      { name: "Ciano (Observação)", value: "text-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200" },
    ];
  }, []);

  const { data: allEvents = [] } = trpc.events.list.useQuery();
  const { data: authData } = trpc.auth.checkSimpleAuth.useQuery();
  const utils = trpc.useUtils();

  const isTrainer = authData?.user?.role === "trainer";
  const isAdmin = authData?.user?.role === "admin";
  const currentUsername = authData?.user?.username;

  const currentMonthNum = currentMonth.getMonth() + 1;
  const currentYearNum = currentMonth.getFullYear();

  const filteredEvents = useMemo(() => {
    if (calendarFilter === "todos") return allEvents;
    if (calendarFilter === "plantoes") {
      return allEvents.filter((e: any) => {
        const type = (e.type || "").toLowerCase();
        return type.includes("zn") || type.includes("hc") || type.includes("zona norte") || type.includes("home care");
      });
    }
    if (calendarFilter === "pessoal") {
      return allEvents.filter((e: any) => {
        const type = (e.type || "").toLowerCase();
        return !type.includes("zn") && !type.includes("hc") && !type.includes("zona norte") && !type.includes("home care");
      });
    }
    return allEvents;
  }, [allEvents, calendarFilter]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredEvents.forEach((event: any) => {
      const key = normalizeDateKey(event.date);
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [filteredEvents]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Evento criado com sucesso");
      resetForm();
      setShowAddEventModal(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Evento atualizado com sucesso");
      resetForm();
      setShowEditModal(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: (deletedEvents) => {
      utils.events.list.invalidate();
      toast.success(`Plantão(ões) excluído(s).`, {
        action: {
          label: 'Desfazer',
          onClick: () => {
            const payload = deletedEvents.map((ev: any) => ({
              date: typeof ev.date === 'string' ? ev.date.split('T')[0] : new Date(ev.date).toISOString().split('T')[0],
              type: ev.type,
              description: ev.description || undefined,
              startTime: ev.startTime || undefined,
              endTime: ev.endTime || undefined,
              color: ev.color || undefined,
              isShift: ev.isShift,
              workplaceId: ev.workplaceId || undefined,
            }));
            createManyMutation.mutate(payload);
          }
        },
        duration: 6000,
      });
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const createManyMutation = trpc.events.createMany.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Eventos restaurados");
    },
    onError: (error) => {
      toast.error(`Erro ao restaurar: ${error.message}`);
    },
  });

  const handleAddEvent = () => {
    if (!selectedDate || !eventType) {
      toast.error("Selecione uma data e tipo de evento");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const type = eventType === "Personalizado" ? customEventType : eventType;

    if (!type.trim()) {
      toast.error("Digite o tipo de evento personalizado");
      return;
    }

    createEventMutation.mutate({
      date: dateStr,
      type,
      description: eventDescription || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      color: eventColor !== "default" ? eventColor : undefined,
      isShift: false,
      workplaceId: workplaceId ? Number(workplaceId) : undefined,
    });
  };

  const handleUpdateEvent = () => {
    if (!editingEvent) return;

    updateEventMutation.mutate({
      id: editingEvent.id,
      type: eventType === "Personalizado" ? customEventType : eventType,
      description: eventDescription || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      color: eventColor !== "default" ? eventColor : undefined,
      isPassed: isPassed,
      workplaceId: workplaceId ? Number(workplaceId) : undefined,
    });
  };

  const handleDeleteEvent = () => {
    if (!eventToDelete) return;

    deleteEventMutation.mutate({
      id: eventToDelete.id,
      mode: deleteMode,
    });
  };

  const handleEditEventClick = (event: any) => {
    setEditingEvent(event);
    setEventType(event.type);
    setCustomEventType(event.type);
    setEventDescription(event.description ?? "");
    setStartTime(event.startTime ?? "");
    setEndTime(event.endTime ?? "");
    setEventColor(event.color ?? "default");
    setIsPassed(event.isPassed || false);
    setWorkplaceId(event.workplaceId ?? "");
    setShowEditModal(true);
  };

  const handleDeleteClick = (event: any) => {
    setEventToDelete(event);
    setDeleteMode("single");
    setShowDeleteConfirm(true);
  };

  const handleAddTraining = () => {
    if (!selectedDate || !trainingType) {
      toast.error("Selecione uma data e tipo de treinamento");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    createEventMutation.mutate({
      date: dateStr,
      type: trainingType,
      description: trainingDescription || undefined,
      startTime: trainingTime || undefined,
      isShift: false,
    });
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setShowDayModal(true);
  };

  const handleNavigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(direction === "prev" ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

  const isRestrictedUser = isAdmin && currentUsername === "PAULA" || isTrainer;

  return (
    <div className="w-full max-w-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            <h1 className="text-lg font-semibold">Calendário</h1>
          </div>

          <div className="flex items-center gap-2">
            {!isRestrictedUser && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFinanceModal(true)}
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Faturamento
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryManager(true)}
            >
              <Tags className="w-4 h-4 mr-1" />
              Categorias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCsvManager(true)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigateMonth("prev")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigateMonth("next")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
            <div key={day} className="text-center font-semibold text-xs py-2">
              {day}
            </div>
          ))}
          {calendarDays.map((day) => {
            const dayKey = normalizeDateKey(day);
            const dayEvents = eventsByDate[dayKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);

            return (
              <div
                key={dayKey}
                onClick={() => handleDayClick(day)}
                className={`min-h-24 p-2 border rounded cursor-pointer transition ${
                  isCurrentMonth
                    ? "bg-background hover:bg-accent"
                    : "bg-muted/30 text-muted-foreground"
                } ${isTodayDate ? "border-primary border-2" : ""}`}
              >
                <div className="text-xs font-semibold mb-1">
                  {format(day, "d")}
                </div>
                <div className={`w-full ${viewMode === 'dots' ? 'flex flex-wrap gap-0.5 mt-1' : 'space-y-[1px]'} overflow-hidden`}>
                  {dayEvents.slice(0, viewMode === 'text' ? 4 : 15).map((e: any) => {
                    const baseColorClasses = e.color ? (e.isPassed ? "opacity-50 " + e.color : e.color) : getEventColor(e.type, e.isPassed);
                    if (viewMode === 'dots') {
                      const colorMatch = baseColorClasses.match(/text-([a-z]+)-700/);
                      const dotBg = colorMatch ? `bg-${colorMatch[1]}-500` : 'bg-slate-400';
                      return <div key={e.id} className={`w-2.5 h-2.5 rounded-full ${dotBg} ${e.isPassed ? "opacity-40" : ""}`} title={getEventLabel({type: e.type, description: e.description})} onClick={(evt) => { evt.stopPropagation(); handleEditEventClick(e); }} />;
                    }
                    return (
                      <div key={e.id} className={`text-[8px] px-1 py-[0.5px] leading-tight rounded-[1px] truncate w-full border-l-2 text-left font-bold ${baseColorClasses} ${e.isPassed ? "line-through opacity-60" : ""}`} onClick={(evt) => { evt.stopPropagation(); handleEditEventClick(e); }}>
                        {e.startTime && <span className="font-extrabold mr-0.5">{e.startTime}</span>}{getEventLabel({type: e.type, description: e.description})}
                      </div>
                    );
                  })}
                  {dayEvents.length > (viewMode === 'text' ? 4 : 15) && <div className="text-[8px] text-muted-foreground pl-0.5 mt-0.5">+{dayEvents.length - (viewMode === 'text' ? 4 : 15)} mais</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda Desktop */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] justify-center mt-3 pt-3 border-t">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span>Natação</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div><span>Musculação</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span>Pilates</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span>HC</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span>ZN</span></div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={calendarFilter === "todos" ? "default" : "outline"}
            size="sm"
            onClick={() => setCalendarFilter("todos")}
          >
            Todos
          </Button>
          <Button
            variant={calendarFilter === "plantoes" ? "default" : "outline"}
            size="sm"
            onClick={() => setCalendarFilter("plantoes")}
          >
            Plantões
          </Button>
          <Button
            variant={calendarFilter === "pessoal" ? "default" : "outline"}
            size="sm"
            onClick={() => setCalendarFilter("pessoal")}
          >
            Pessoal
          </Button>
          <div className="flex items-center bg-muted/50 rounded-md p-0.5 ml-4">
            <Button variant={viewMode === "text" ? "default" : "ghost"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setViewMode("text")}>Texto</Button>
            <Button variant={viewMode === "dots" ? "default" : "ghost"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setViewMode("dots")}><Circle className="w-3 h-3 mr-1" /> Bolinhas</Button>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-2">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event: any) => (
              <Card key={event.id} className={getEventColor(event.type, event.isPassed || false)}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{event.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(event.date), "dd/MM/yyyy")}
                    </p>
                    {event.description && (
                      <p className="text-sm">{event.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditEventClick(event)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(event)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum evento neste período
            </p>
          )}
        </div>
      </div>

      {/* Financial Modal */}
      <Dialog open={showFinanceModal} onOpenChange={setShowFinanceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Painel Financeiro</DialogTitle>
          </DialogHeader>
          
          <FinancialDashboard targetDate={currentMonth} />

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowWorkplaceManager(true)}
            >
              <Building className="w-4 h-4 mr-1" />
              Locais de Trabalho
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowUnlinkedManager(true)}
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Plantões Avulsos
            </Button>
            <Button onClick={() => setShowFinanceModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workplace Manager */}
      <WorkplaceManager
        open={showWorkplaceManager}
        onOpenChange={setShowWorkplaceManager}
      />

      {/* Unlinked Rate Manager */}
      <UnlinkedRateManager
        open={showUnlinkedManager}
        onOpenChange={setShowUnlinkedManager}
      />

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciador de Categorias</DialogTitle>
          </DialogHeader>
          <CategoryManager open={showCategoryManager} onOpenChange={setShowCategoryManager} />
        </DialogContent>
      </Dialog>

      {/* CSV Manager Dialog */}
      <Dialog open={showCsvManager} onOpenChange={setShowCsvManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar CSV</DialogTitle>
          </DialogHeader>
          <CsvManager open={showCsvManager} onOpenChange={setShowCsvManager} allEvents={allEvents} />
        </DialogContent>
      </Dialog>

      {/* Day Modal */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "dd/MM/yyyy")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              className="w-full"
              onClick={() => {
                setShowAddEventModal(true);
                setShowDayModal(false);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Evento
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                setShowAddTrainingModal(true);
                setShowDayModal(false);
              }}
            >
              <Heart className="w-4 h-4 mr-2" />
              Adicionar Treinamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Event Modal */}
      <Dialog open={showAddEventModal} onOpenChange={setShowAddEventModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
              />
            </div>

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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEventModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddEvent}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
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
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPassed"
                checked={isPassed}
                onChange={(e) => setIsPassed(e.target.checked)}
              />
              <Label htmlFor="isPassed">Marcar como Passado/Repassado</Label>
            </div>

            <div>
              <Label>Local de Trabalho</Label>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateEvent}>Atualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar Evento</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Como você gostaria de deletar este evento?
          </p>

          <RadioGroup value={deleteMode} onValueChange={(val: any) => setDeleteMode(val)}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single">Apenas este evento</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="future" id="future" />
              <Label htmlFor="future">Este e os próximos</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all">Todos desta série</Label>
            </div>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Training Modal */}
      <Dialog open={showAddTrainingModal} onOpenChange={setShowAddTrainingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Treinamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Treinamento</Label>
              <Input
                value={trainingType}
                onChange={(e) => setTrainingType(e.target.value)}
                placeholder="Ex: Musculação, Pilates"
              />
            </div>

            <div>
              <Label>Horário (opcional)</Label>
              <Input
                type="time"
                value={trainingTime}
                onChange={(e) => setTrainingTime(e.target.value)}
              />
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={trainingDescription}
                onChange={(e) => setTrainingDescription(e.target.value)}
                placeholder="Adicione detalhes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTrainingModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTraining}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
