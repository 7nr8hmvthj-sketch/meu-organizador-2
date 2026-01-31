import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function getEventColor(type: string, isPassed: boolean): string {
  if (isPassed) return "text-gray-400 bg-gray-50 dark:bg-gray-900/30";
  
  const typeLower = type.toLowerCase();
  if (typeLower.includes("natação") || typeLower.includes("natacao")) return "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300";
  if (typeLower.includes("musculação") || typeLower.includes("musculacao")) return "text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300";
  if (typeLower.includes("pilates")) return "text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300";
  if (typeLower.includes("hc")) return "text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300";
  if (typeLower.includes("manhã") || typeLower.includes("manha")) return "text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300";
  if (typeLower.includes("tarde")) return "text-orange-700 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300";
  if (typeLower.includes("noturno")) return "text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300";
  if (typeLower.includes("apoio")) return "text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300";
  return "text-pink-700 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-300";
}

function extractTime(description: string, type: string): string {
  // Try to extract time from description (format: HH:MM or HH:MM-HH:MM)
  const timeMatch = description?.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return timeMatch[0];
  }
  
  // Try to extract from type (e.g., "Manhã (07-13)")
  const typeTimeMatch = type?.match(/\((\d{1,2})-(\d{1,2})\)/);
  if (typeTimeMatch) {
    return `${typeTimeMatch[1]}:00`;
  }
  
  return "";
}

function getEventLabel(event: any): string {
  const time = extractTime(event.description || "", event.type);
  
  // For swimming events, extract time from description
  if (event.type.toLowerCase().includes("natação")) {
    const timeMatch = (event.description || "").match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return `Natação ${timeMatch[0]}`;
    }
    return "Natação";
  }
  
  // For training events
  if (event.type.toLowerCase().includes("musculação") || event.type.toLowerCase().includes("pilates")) {
    return time ? `${event.type} ${time}` : event.type;
  }
  
  // For shifts, extract hours from type (e.g., "Manhã (07-13)" -> "Manhã 7-13")
  if (event.type.toLowerCase().includes("manhã") || 
      event.type.toLowerCase().includes("tarde") ||
      event.type.toLowerCase().includes("noturno") ||
      event.type.toLowerCase().includes("apoio")) {
    const shortType = event.type.split('(')[0].trim();
    const hoursMatch = event.type.match(/\((\d{1,2})-(\d{1,2})\)/);
    if (hoursMatch) {
      return `${shortType} ${hoursMatch[1]}-${hoursMatch[2]}`;
    }
    return time ? `${shortType} ${time}` : shortType;
  }
  
  // For HC shifts, extract hours from type or use default based on shift type
  if (event.type.toLowerCase().includes("hc")) {
    const hoursMatch = event.type.match(/\((\d{1,2})-(\d{1,2})\)/);
    if (hoursMatch) {
      return `HC ${hoursMatch[1]}-${hoursMatch[2]}`;
    }
    // Default HC hours based on shift name
    const typeLower = event.type.toLowerCase();
    if (typeLower.includes("manhã") || typeLower.includes("manha")) {
      return "HC 7-13";
    }
    if (typeLower.includes("tarde")) {
      return "HC 13-19";
    }
    if (typeLower.includes("noturno") || typeLower.includes("noite")) {
      return "HC 19-7";
    }
    return time ? `HC ${time}` : "HC";
  }
  
  // For Zona Norte/Sul events
  if (event.type.toLowerCase().includes("zona")) {
    const hoursMatch = event.type.match(/\((\d{1,2})-(\d{1,2})\)/);
    if (hoursMatch) {
      return `${event.type.split('(')[0].trim()} ${hoursMatch[1]}-${hoursMatch[2]}`;
    }
    // Default Zona hours based on shift name
    const typeLower = event.type.toLowerCase();
    const zoneName = event.type.split('(')[0].trim();
    if (typeLower.includes("manhã") || typeLower.includes("manha")) {
      return `${zoneName} 7-13`;
    }
    if (typeLower.includes("tarde")) {
      return `${zoneName} 13-19`;
    }
    if (typeLower.includes("noturno") || typeLower.includes("noite")) {
      return `${zoneName} 19-7`;
    }
    return time ? `${zoneName} ${time}` : zoneName;
  }
  
  // For other events, show description or type
  const label = event.description || event.type;
  return time ? `${label.substring(0, 15)} ${time}` : label.substring(0, 18);
}

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
      toast.success("Treino adicionado com sucesso!");
      utils.events.list.invalidate();
      setShowAddTrainingModal(false);
      setTrainingType("");
      setTrainingTime("");
      setTrainingDescription("");
    },
    onError: () => {
      toast.error("Erro ao adicionar treino");
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday)
  const startDayOfWeek = getDay(monthStart);

  // Events grouped by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach(e => {
      // Extrair apenas a parte da data (YYYY-MM-DD) sem conversão de timezone
      const dateStr = String(e.date).split('T')[0];
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
    if (isTrainer) {
      // For trainers, show add training modal
      setShowAddTrainingModal(true);
    } else {
      // For admin, show day details
      setShowDayModal(true);
    }
  };

  const handleAddTraining = () => {
    if (!selectedDate || !trainingType || !trainingTime) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Format date correctly without timezone issues
    // Use the year, month, day directly from the selected date
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Calendário
          </h1>
          <p className="text-muted-foreground">
            {isTrainer ? "Visualize a agenda e adicione treinos" : "Visualize seus eventos por mês"}
          </p>
        </div>
      </div>

      {/* Calendar Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-lg capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[120px]" />
            ))}

            {/* Days of the month */}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate.get(dateStr) || [];
              const hasEvents = dayEvents.length > 0;
              const today = isToday(day);

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[120px] p-2 rounded-lg text-sm relative border
                    hover:bg-accent transition-colors text-left align-top
                    ${today ? "border-primary bg-primary/5 font-bold" : "border-border"}
                    ${!isSameMonth(day, currentMonth) ? "text-muted-foreground/50 bg-muted/30" : ""}
                  `}
                >
                  <span className="block text-center mb-1 font-semibold">{format(day, "d")}</span>
                  {hasEvents && (
                    <div className="space-y-1 text-[10px] leading-tight">
                      {dayEvents.slice(0, 4).map((e, i) => (
                        <div
                          key={i}
                          className={`px-1 py-0.5 rounded truncate ${getEventColor(e.type, e.isPassed || false)} ${
                            e.isPassed ? "line-through" : ""
                          }`}
                          title={getEventLabel(e)}
                        >
                          {getEventLabel(e)}
                        </div>
                      ))}
                      {dayEvents.length > 4 && (
                        <div className="text-[9px] text-muted-foreground text-center">
                          +{dayEvents.length - 4} mais
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Legenda:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-300" />
                <span>Natação</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-300" />
                <span>Musculação</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-purple-100 dark:bg-purple-900/30 border border-purple-300" />
                <span>Pilates</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-300" />
                <span>HC</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300" />
                <span>Manhã</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/30 border border-orange-300" />
                <span>Tarde</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300" />
                <span>Noturno</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-900/30 border border-gray-300" />
                <span>Passado</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Modal (for admin) */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {selectedDateEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum evento neste dia
              </p>
            ) : (
              selectedDateEvents.map(event => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    event.isPassed || event.isCancelled ? "opacity-60" : ""
                  }`}
                  style={{
                    borderLeftColor: event.type.toLowerCase().includes("natação") ? "#3b82f6" :
                      event.type.toLowerCase().includes("musculação") ? "#22c55e" :
                      event.type.toLowerCase().includes("pilates") ? "#a855f7" :
                      event.type.toLowerCase().includes("hc") ? "#ef4444" :
                      event.type.toLowerCase().includes("manhã") ? "#eab308" :
                      event.type.toLowerCase().includes("tarde") ? "#f97316" :
                      event.type.toLowerCase().includes("noturno") ? "#6366f1" :
                      event.type.toLowerCase().includes("apoio") ? "#a855f7" : "#ec4899"
                  }}
                >
                  <p className={`font-medium ${event.isPassed || event.isCancelled ? "line-through" : ""}`}>
                    {event.description || event.type}
                  </p>
                  <p className="text-sm text-muted-foreground">{event.type}</p>
                  {event.passedReason && (
                    <span className="passed-note mt-2">
                      📝 {event.passedReason}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Training Modal (for trainers) */}
      <Dialog open={showAddTrainingModal} onOpenChange={setShowAddTrainingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Inserir Treino
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Data: {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              
              {/* Show existing events for this day */}
              {selectedDateEvents.length > 0 && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-2">Eventos neste dia:</p>
                  <div className="space-y-1 text-xs">
                    {selectedDateEvents.map((e, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          e.type.toLowerCase().includes("natação") ? "bg-blue-500" :
                          e.type.toLowerCase().includes("musculação") ? "bg-green-500" :
                          e.type.toLowerCase().includes("pilates") ? "bg-purple-500" : "bg-gray-400"
                        }`} />
                        <span>{getEventLabel(e)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-type">Tipo de Treino *</Label>
              <Select value={trainingType} onValueChange={setTrainingType}>
                <SelectTrigger id="training-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Musculação">Musculação</SelectItem>
                  <SelectItem value="Pilates">Pilates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-time">Horário *</Label>
              <Input
                id="training-time"
                type="time"
                value={trainingTime}
                onChange={(e) => setTrainingTime(e.target.value)}
                placeholder="HH:MM"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-description">Descrição (opcional)</Label>
              <Textarea
                id="training-description"
                value={trainingDescription}
                onChange={(e) => setTrainingDescription(e.target.value)}
                placeholder="Ex: Treino de pernas, Treino de core..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTrainingModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTraining} disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? "Adicionando..." : "Adicionar Treino"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
