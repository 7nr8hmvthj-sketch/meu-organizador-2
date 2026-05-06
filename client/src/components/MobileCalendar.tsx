import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, isToday, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MobileCalendarProps {
  currentMonth: Date;
  days: Date[];
  startDayOfWeek: number;
  selectedDate: Date | null;
  eventsByDate: Map<string, any[]>;
  selectedDateEvents: any[];
  isAdmin: boolean;
  onDayClick: (day: Date) => void;
  onAddEvent: () => void;
  onEditEvent: (event: any) => void;
  onDeleteEvent: (event: any) => void;
  onTodayClick: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  getEventColor: (type: string, isPassed: boolean) => string;
  normalizeDateKey: (date: Date) => string;
}

export function MobileCalendar({
  currentMonth,
  days,
  startDayOfWeek,
  selectedDate,
  eventsByDate,
  selectedDateEvents,
  isAdmin,
  onDayClick,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onTodayClick,
  onPrevMonth,
  onNextMonth,
  getEventColor,
  normalizeDateKey,
}: MobileCalendarProps) {
  const extractColorBg = (colorClass: string): string => {
    if (colorClass.includes("bg-blue")) return "bg-blue-400";
    if (colorClass.includes("bg-green")) return "bg-green-400";
    if (colorClass.includes("bg-purple")) return "bg-purple-400";
    if (colorClass.includes("bg-red")) return "bg-red-400";
    if (colorClass.includes("bg-amber")) return "bg-amber-400";
    if (colorClass.includes("bg-orange")) return "bg-orange-400";
    if (colorClass.includes("bg-indigo")) return "bg-indigo-400";
    if (colorClass.includes("bg-pink")) return "bg-pink-400";
    if (colorClass.includes("bg-cyan")) return "bg-cyan-400";
    if (colorClass.includes("bg-teal")) return "bg-teal-400";
    if (colorClass.includes("bg-gray")) return "bg-gray-400";
    return "bg-slate-400";
  };

  return (
    <Card className="shadow-md md:hidden">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onTodayClick}>Hoje</Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <CardTitle className="text-base font-semibold uppercase">
              {format(currentMonth, "MMM yyyy", { locale: ptBR })}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <Button variant="ghost" size="icon" onClick={onAddEvent}><Plus className="w-5 h-5" /></Button>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        {/* Mobile Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5 mb-4">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-bold text-muted-foreground uppercase py-1"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-4">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-square bg-gray-50/50 dark:bg-gray-900/10 rounded"
            />
          ))}

          {days.map((day) => {
            const dateStr = normalizeDateKey(day);
            const dayEvents = eventsByDate.get(dateStr) || [];
            const isSelected =
              selectedDate &&
              format(selectedDate, "yyyy-MM-dd") === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => onDayClick(day)}
                className={`aspect-square flex flex-col items-center justify-start pt-1 rounded text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-red-500 text-white"
                    : isToday(day)
                    ? "bg-primary/10 text-primary"
                    : "bg-gray-50 dark:bg-gray-900/20 text-foreground"
                } ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}`}
              >
                <span>{format(day, "d")}</span>
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, idx) => {
                    const colorClass = e.color || getEventColor(e.type, e.isPassed);
                    const bgColor = extractColorBg(colorClass);
                    return (
                      <div
                        key={idx}
                        className={`w-1 h-1 rounded-full ${bgColor}`}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>

        {/* Mobile Events List */}
        <div className="border-t pt-3">
          <h3 className="text-sm font-semibold mb-2">
            {selectedDate
              ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
              : "Selecione um dia"}
          </h3>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {selectedDateEvents.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-4">
                Sem eventos.
              </p>
            ) : (
              selectedDateEvents.map((event) => {
                const colorClass = event.color || getEventColor(event.type, event.isPassed);
                const bgColor = extractColorBg(colorClass);

                return (
                  <div key={event.id} className="flex mb-2 shadow-sm rounded-md bg-card border overflow-hidden">
                    <div className={`w-3 shrink-0 ${bgColor} ${event.isPassed ? "opacity-50" : ""}`}></div>
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
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 bg-muted/50" onClick={() => onEditEvent(event)}>
                            <Pencil className="w-3 h-3"/>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 bg-red-50 dark:bg-red-900/20 text-red-500 hover:text-red-700" onClick={() => onDeleteEvent({ id: event.id, type: event.type })}>
                            <Trash2 className="w-3 h-3"/>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
