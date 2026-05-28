import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil, Trash2, Plus, Tags, Briefcase, DollarSign, FileSpreadsheet, Building } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import CategoryManager from "./CategoryManager";
import WorkplaceManager from "../components/WorkplaceManager";
import { UnlinkedRateManager } from "../components/UnlinkedRateManager";
import FinancialDashboard from "../components/FinancialDashboard";
import CsvManager from "@/components/CsvManager";
import { MobileCalendar } from "@/components/MobileCalendar";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, getDate, parseISO } from "date-fns";
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

  const [showShiftDivider, setShowShiftDivider] = useState(false);
  const [doctorsCount, setDoctorsCount] = useState<number>(2);
  const [dividerStartTime, setDividerStartTime] = useState("01:00");
  const [dividerEndTime, setDividerEndTime] = useState("07:00");
  const [dividedShifts, setDividedShifts] = useState<string[]>([]);
  
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
  const [eventValue, setEventValue] = useState<string>("");
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
    const seenValues = new Set(GLOBAL_EVENT_TYPES.map(g => g.value.toLowerCase()));
    dbCategories.forEach((cat: any) => {
      const catUserId = cat.userId ?? cat.userid;
      const nameLower = (cat.name || "").toLowerCase();
      if (catUserId && !seenValues.has(nameLower)) {
        seenValues.add(nameLower);
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
  const isMainAdmin = authData?.user?.userId === 1;
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
      utils.workplaces.getMonthlySummary.invalidate();
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
      utils.workplaces.getMonthlySummary.invalidate();
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
      utils.workplaces.getMonthlySummary.invalidate();
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
    onSuccess: (created) => {
      utils.events.list.invalidate();
      toast.success(`${created.length} evento(s) criado(s) com sucesso`);
      resetForm();
      setShowAddEventModal(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar eventos: ${error.message}`);
    },
  });

  // Gera array de datas para eventos recorrentes
  const generateRecurringDates = (startDate: Date): string[] => {
    const dates: string[] = [];
    const endDate = recurrenceEndDate ? new Date(recurrenceEndDate + "T12:00:00") : new Date(startDate.getFullYear(), 11, 31);
    let cursor = new Date(startDate);

    if (recurrenceType === "weekly") {
      while (cursor <= endDate) {
        dates.push(format(cursor, "yyyy-MM-dd"));
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
      }
    } else {
      // Mensal: avança semana a semana mas filtra pela semana do mês
      while (cursor <= endDate) {
        // Calcula qual semana do mês é o cursor (1-5)
        const dayOfMonth = cursor.getDate();
        const weekOfMonth = Math.ceil(dayOfMonth / 7);
        if (monthlyOccurrences.includes(weekOfMonth)) {
          dates.push(format(cursor, "yyyy-MM-dd"));
        }
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
      }
    }
    return dates;
  };

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

    const basePayload = {
      type,
      description: eventDescription ? eventDescription.trim() : undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      color: eventColor !== "default" ? eventColor : undefined,
      isShift: false,
      workplaceId: workplaceId ? Number(workplaceId) : undefined,
      value: eventValue ? Number(eventValue) : undefined,
    };

    // Fechar modal imediatamente para evitar cliques duplicados
    setShowAddEventModal(false);

    if (!isRecurring) {
      createEventMutation.mutate({ ...basePayload, date: dateStr });
    } else {
      const dates = generateRecurringDates(selectedDate);
      if (dates.length === 0) {
        toast.error("Nenhuma data gerada. Verifique a data de término.");
        return;
      }
      const batch = dates.map((d) => ({ ...basePayload, date: d }));
      createManyMutation.mutate(batch);
    }
  };

  const handleUpdateEvent = () => {
    if (!editingEvent) return;

    // Fechar modal imediatamente para evitar cliques duplicados
    setShowEditModal(false);

    updateEventMutation.mutate({
      id: editingEvent.id,
      type: eventType === "Personalizado" ? customEventType : eventType,
      description: eventDescription ? eventDescription.trim() : undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      color: eventColor !== "default" ? eventColor : undefined,
      isPassed: isPassed,
      workplaceId: workplaceId ? Number(workplaceId) : undefined,
      value: eventValue ? Number(eventValue) : null,
    });
  };

  const handleDeleteEvent = () => {
    if (!eventToDelete) return;

    // Fechar modal imediatamente para evitar cliques duplicados
    setShowDeleteConfirm(false);

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
    setEventValue(event.value ? String(event.value) : "");
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

  const dayEventsRef = useRef<HTMLDivElement>(null);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    if (isTrainer) setShowAddTrainingModal(true);
    // Desktop: scroll para a lista de eventos inline
    setTimeout(() => {
      dayEventsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleNavigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(direction === "prev" ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

  // Faturamento visível apenas para o admin principal (userId=1)
  const isRestrictedUser = !isMainAdmin;

  const calculateDivision = () => {
    if (!dividerStartTime || !dividerEndTime) {
      toast.error("Preencha os horários");
      return;
    }
    const [startH, startM] = dividerStartTime.split(':').map(Number);
    const [endH, endM] = dividerEndTime.split(':').map(Number);

    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;

    // Matemática da madrugada
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

  return (
    <div className="w-full max-w-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CalendarIcon className="w-5 h-5 shrink-0" />
            <h1 className="text-lg font-semibold truncate">Agenda Mensal</h1>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isRestrictedUser && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFinanceModal(true)}
                className="px-2"
                title="Faturamento"
              >
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Faturamento</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryManager(true)}
              className="px-2"
              title="Categorias"
            >
              <Tags className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Categorias</span>
            </Button>
            {/* CSV button hidden for now */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowShiftDivider(true); setDividedShifts([]); }}
              className="px-2 font-bold"
              title="Divisor de Plantões"
            >
              ÷
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Mobile Calendar */}
        <MobileCalendar
          currentMonth={currentMonth}
          days={calendarDays}
          startDayOfWeek={getDay(startOfMonth(currentMonth))}
          selectedDate={selectedDate}
          eventsByDate={new Map(Object.entries(eventsByDate))}
          selectedDateEvents={selectedDate ? (eventsByDate[normalizeDateKey(selectedDate)] || []) : []}
          isAdmin={isAdmin}
          isTrainer={isTrainer}
          onDayClick={(day) => { setSelectedDate(day); }}
          onAddEvent={() => setShowAddEventModal(true)}
          onEditEvent={handleEditEventClick}
          onDeleteEvent={handleDeleteClick}
          onTodayClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
          onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
          onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
          getEventColor={getEventColor}
          normalizeDateKey={normalizeDateKey}
        />

        {/* Desktop Calendar Header */}
        <div className="hidden md:flex items-center justify-between gap-4 w-full mb-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-5 h-5" /></Button>
          <h2 className="text-lg font-semibold capitalize flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</h2>
          <div className="flex items-center bg-muted/50 rounded-md p-0.5 mx-2">
            <Button variant={viewMode === "text" ? "default" : "ghost"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setViewMode("text")}>Texto</Button>
            <Button variant={viewMode === "dots" ? "default" : "ghost"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setViewMode("dots")}>Bolinhas</Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => { setShowShiftDivider(true); setDividedShifts([]); }} title="Divisor de Plantões">
              <span className="hidden sm:inline">Dividir Plantão</span>
              <span className="sm:hidden font-bold">÷ Horas</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </div>

        {/* Calendar Grid - Desktop Only */}
        <div className="hidden md:block bg-white dark:bg-background rounded-xl p-3 border border-slate-200 dark:border-slate-700">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((day) => (
              <div key={day} className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-slate-100 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700/40" />
            ))}
            {calendarDays.map((day) => {
              const dayKey = normalizeDateKey(day);
              const dayEvents = eventsByDate[dayKey] || [];
              const dayNumber = getDate(day);
              const closingWorkplaces = workplaces.filter((wp: any) => wp.cycleEndDay === dayNumber);

              return (
                <button
                  key={dayKey}
                  onClick={() => handleDayClick(day)}
                  className={`relative aspect-square flex flex-col items-center justify-start pt-2 rounded-lg text-sm font-semibold transition-all border ${
                    isToday(day)
                      ? "bg-primary/15 border-primary/60 ring-2 ring-primary/30 text-primary shadow-sm"
                      : selectedDate && normalizeDateKey(selectedDate) === dayKey
                        ? "bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 shadow-md text-foreground"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-200 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm"
                  } ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}`}
                >
                  <span className={`text-sm font-bold ${isToday(day) ? "text-primary" : ""}`}>{format(day, "d")}</span>
                  
                  {viewMode === 'dots' ? (
                    <div className="flex flex-wrap justify-center gap-[3px] mt-1 px-1">
                      {dayEvents.slice(0, 6).map((e: any) => {
                        const baseColorClasses = e.color ? (e.isPassed ? "opacity-50 " + e.color : e.color) : getEventColor(e.type, e.isPassed);
                        const colorMatch = baseColorClasses.match(/text-([a-z]+)-700/);
                        const dotBg = colorMatch ? `bg-${colorMatch[1]}-500` : 'bg-slate-400';
                        return (
                          <div
                            key={e.id}
                            className={`w-2 h-2 rounded-full ${dotBg} ${e.isPassed ? "opacity-40" : ""}`}
                            title={getEventLabel({type: e.type, description: e.description})}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5 w-full px-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 4).map((e: any) => {
                        const baseColorClasses = e.color ? (e.isPassed ? "opacity-50 " + e.color : e.color) : getEventColor(e.type, e.isPassed);
                        return (
                          <div key={e.id} className={`text-[9px] px-1 py-0.5 rounded-sm truncate w-full border-l-4 text-left font-medium ${baseColorClasses} ${e.isPassed ? "line-through opacity-60" : ""}`}>
                            {e.startTime && <span className="font-extrabold mr-0.5">{e.startTime}</span>}
                            {getEventLabel({type: e.type, description: e.description})}
                          </div>
                        );
                      })}
                      {dayEvents.length > 4 && (
                        <span className="text-[8px] text-muted-foreground text-center">+{dayEvents.length - 4}</span>
                      )}
                    </div>
                  )}
                  {/* Legenda de Horas ZN no dia 19 */}
                  {dayNumber === 19 && (() => {
                    const znH = calculateZNHours(allEvents.filter((e: any) => e.createdBy === currentUsername), day);
                    return znH > 0 ? (
                      <div className="absolute top-0.5 right-0.5">
                        <span className="text-[7px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-0.5 py-0" title="Total de horas ZN do ciclo (dia 20 ao 19)">
                          {znH}h ZN
                        </span>
                      </div>
                    ) : null;
                  })()}
                  {/* Badge de Fechamento de Ciclo */}
                  {closingWorkplaces.length > 0 && (
                    <div className="absolute bottom-0.5 left-0.5 right-0.5">
                      {closingWorkplaces.slice(0, 1).map((wp: any) => (
                        <span key={wp.id} className="block text-[7px] leading-tight font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-0.5 py-0 truncate text-center" title={`Fechamento: ${wp.name}`}>
                          💰 {wp.name.length > 6 ? wp.name.slice(0, 6) : wp.name}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda Desktop */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs justify-center pt-3 border-t">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div><span>Natação</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span>Musculação</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div><span>Pilates</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span>HC</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div><span>ZN</span></div>
          </div>
        </div>

        {/* Eventos do Dia Selecionado - Inline (Desktop) */}
        <div ref={dayEventsRef} className="hidden md:block border-t pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                : "Selecione um dia"}
            </h3>
            {!isTrainer && selectedDate && (
              <Button size="sm" onClick={() => setShowAddEventModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Novo Evento
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {(() => {
              const dayKey = selectedDate ? normalizeDateKey(selectedDate) : "";
              const dayEvents = dayKey ? (eventsByDate[dayKey] || []) : [];
              if (!selectedDate) return <p className="text-center text-muted-foreground text-sm py-4">Clique num dia para ver os eventos.</p>;
              if (dayEvents.length === 0) return <p className="text-center text-muted-foreground text-sm py-4">Sem eventos neste dia.</p>;
              return dayEvents.map((event: any) => {
                const colorClass = event.color || getEventColor(event.type, event.isPassed || false);
                const bgMatch = colorClass.match(/bg-([a-z]+)-/);
                const barColor = bgMatch ? `bg-${bgMatch[1]}-400` : "bg-slate-400";
                return (
                  <div key={event.id} className="flex shadow-sm rounded-md bg-card border overflow-hidden">
                    <div className={`w-3 shrink-0 ${barColor} ${event.isPassed ? "opacity-50" : ""}`}></div>
                    <div className={`flex-1 p-3 flex justify-between items-center ${event.isPassed ? "opacity-60" : ""}`}>
                      <div className="flex-1 pr-2">
                        {event.startTime && (
                          <div className="text-[11px] text-muted-foreground font-medium mb-0.5">
                            {event.startTime} {event.endTime ? `- ${event.endTime}` : ""}
                          </div>
                        )}
                        <div className="text-sm font-bold text-foreground leading-tight">
                          {event.description && event.description.length > 2 && event.description !== event.type
                            ? event.description
                            : event.type}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {event.type} {event.isPassed && "(Repassado)"}
                          {event.value && <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">R$ {Number(event.value).toFixed(2).replace('.', ',')}</span>}
                        </div>
                      </div>
                      {!isTrainer && (
                        <div className="flex gap-2 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 bg-muted/50" onClick={() => handleEditEventClick(event)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 bg-red-50 dark:bg-red-900/20 text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(event)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
              {!isTrainer && <Button size="sm" onClick={() => { setShowDayModal(false); setShowAddEventModal(true); }} className="ml-4"><Plus className="w-4 h-4 mr-1" /> Novo Evento</Button>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedDate && eventsByDate[normalizeDateKey(selectedDate)] && eventsByDate[normalizeDateKey(selectedDate)].length > 0 ? (
              eventsByDate[normalizeDateKey(selectedDate)].map((event: any) => (
                <Card key={event.id} className={getEventColor(event.type, event.isPassed || false)}>
                  <CardContent className="pt-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{getEventLabel({ type: event.type, description: event.description })}</p>
                      {event.description && event.description.trim() !== event.type && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.description.replace(event.type, '').trim()}
                        </p>
                      )}
                      {event.value && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">R$ {Number(event.value).toFixed(2).replace('.', ',')}</p>}
                      <p className="text-xs text-muted-foreground mt-1">Criado por: {event.createdBy || 'Sistema'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEditEventClick(event)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEventToDelete(event); setShowDeleteConfirm(true); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento neste dia</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Event Modal */}
      <Dialog open={showAddEventModal} onOpenChange={setShowAddEventModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto px-2">
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

            {/* Horário com botões rápidos */}
            <div className="space-y-3 w-full">
              <div className="w-full">
                <label className="text-xs text-muted-foreground mb-2 block font-medium">Horários Rápidos (Plantões)</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("07:00"); setEndTime("13:00"); }}>7-13</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("13:00"); setEndTime("19:00"); }}>13-19</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("19:00"); setEndTime("01:00"); }}>19-01</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("19:00"); setEndTime("07:00"); }}>19-07</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setStartTime(""); setEndTime(""); }}>Limpar</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full border-t pt-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Início Manual</label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fim Manual</label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full" />
                </div>
              </div>
            </div>

            {/* Recorrência */}
            <div className="border-t pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <Label htmlFor="isRecurring" className="cursor-pointer font-medium">Repetir Evento</Label>
              </div>

              {isRecurring && (
                <div className="mt-3 space-y-3 pl-1">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Frequência</Label>
                    <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as "weekly" | "monthly")}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal (todo semana)</SelectItem>
                        <SelectItem value="monthly">Mensal (semanas específicas)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {recurrenceType === "monthly" && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Semanas do mês</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((week) => (
                          <button
                            key={week}
                            type="button"
                            onClick={() => {
                              setMonthlyOccurrences((prev) =>
                                prev.includes(week)
                                  ? prev.filter((w) => w !== week)
                                  : [...prev, week].sort()
                              );
                            }}
                            className={`w-8 h-8 rounded text-xs font-semibold border transition-colors ${
                              monthlyOccurrences.includes(week)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                            }`}
                          >
                            {week}ª
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Selecione as semanas em que o evento ocorre</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Repetir até</Label>
                    <Input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>
              )}
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
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto px-2">
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

            {/* Horário com botões rápidos */}
            <div className="space-y-3 w-full">
              <div className="w-full">
                <label className="text-xs text-muted-foreground mb-2 block font-medium">Horários Rápidos (Plantões)</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("07:00"); setEndTime("13:00"); }}>7-13</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("13:00"); setEndTime("19:00"); }}>13-19</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("19:00"); setEndTime("01:00"); }}>19-01</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setStartTime("19:00"); setEndTime("07:00"); }}>19-07</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setStartTime(""); setEndTime(""); }}>Limpar</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full border-t pt-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Início Manual</label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fim Manual</label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full" />
                </div>
              </div>
            </div>

            <div>
              <Label>Valor do Plantão - R$ (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={eventValue}
                onChange={(e) => setEventValue(e.target.value)}
                placeholder="Ex: 150.00"
              />
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
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Treinamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto px-2">
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

      {/* Modal: Divisor de Plantões */}
      <Dialog open={showShiftDivider} onOpenChange={setShowShiftDivider}>
        <DialogContent>
          <DialogHeader><DialogTitle>Divisor de Plantões</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Número de Médicos</Label>
              <Input type="number" min="2" max="10" value={doctorsCount} onChange={e => setDoctorsCount(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Horário Início</Label>
                <Input type="time" value={dividerStartTime} onChange={e => setDividerStartTime(e.target.value)} />
              </div>
              <div>
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
