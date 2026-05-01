import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
          <Button variant="ghost" size="sm" onClick={onTodayClick}>
            Hoje
          </Button>
          <CardTitle className="text-base font-semibold uppercase">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onAddEvent}>
            <Plus className="w-5 h-5" />
          </Button>
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
              selectedDateEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-2 rounded border-l-4 text-xs ${
                    event.color
                      ? event.isPassed
                        ? "opacity-50 " + event.color
                        : event.color
                      : getEventColor(event.type, event.isPassed)
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold">{event.type}</div>
                      {event.startTime && (
                        <div className="text-[10px] opacity-70">
                          {event.startTime}
                          {event.endTime ? " - " + event.endTime : ""}
                        </div>
                      )}
                      {event.description && (
                        <div className="text-[10px] opacity-70 mt-0.5">
                          {event.description.substring(0, 50)}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 ml-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onEditEvent(event)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500"
                          onClick={() =>
                            onDeleteEvent({ id: event.id, type: event.type })
                          }
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
