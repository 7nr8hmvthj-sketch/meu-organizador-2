import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

function getEventDotColor(type: string, isPassed: boolean): string {
  if (isPassed) return "bg-gray-400";
  
  const typeLower = type.toLowerCase();
  if (typeLower.includes("hc")) return "bg-red-500";
  if (typeLower.includes("manhã") || typeLower.includes("manha")) return "bg-yellow-500";
  if (typeLower.includes("tarde")) return "bg-orange-500";
  if (typeLower.includes("noturno")) return "bg-indigo-500";
  if (typeLower.includes("apoio")) return "bg-purple-500";
  return "bg-pink-500";
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  const { data: events = [] } = trpc.events.list.useQuery();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday)
  const startDayOfWeek = getDay(monthStart);

  // Events grouped by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach(e => {
      const dateStr = e.date instanceof Date ? format(e.date, 'yyyy-MM-dd') : String(e.date).split('T')[0];
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
    setShowDayModal(true);
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
          <p className="text-muted-foreground">Visualize seus eventos por mês</p>
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
              <div key={`empty-${i}`} className="aspect-square" />
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
                    aspect-square p-1 rounded-lg text-sm relative
                    hover:bg-accent transition-colors
                    ${today ? "bg-primary/10 font-bold text-primary" : ""}
                    ${!isSameMonth(day, currentMonth) ? "text-muted-foreground/50" : ""}
                  `}
                >
                  <span className="block">{format(day, "d")}</span>
                  {hasEvents && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${getEventDotColor(e.type, e.isPassed || false)}`}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
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
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>HC</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>Manhã</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Tarde</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Noturno</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Apoio</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                <span>Pessoal</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Passado</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Modal */}
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
                    borderLeftColor: event.type.toLowerCase().includes("hc") ? "#ef4444" :
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
    </div>
  );
}
