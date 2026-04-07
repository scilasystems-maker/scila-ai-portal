"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  format, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO
} from "date-fns";
import { es } from "date-fns/locale";

interface CalendarViewProps {
  data: any[];
  dateField: string;
  timeField?: string;
  nameField: string;
  statusField?: string;
  onEventClick: (event: any) => void;
}

const STATUS_DOT: Record<string, string> = {
  confirmada: "bg-brand-blue",
  completada: "bg-success",
  cancelada: "bg-danger",
  pendiente: "bg-warning",
  "no-show": "bg-danger",
};

export function CalendarView({ data, dateField, timeField, nameField, statusField, onEventClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    data.forEach(item => {
      const dateStr = item[dateField];
      if (!dateStr) return;
      // Parse date - handle various formats
      let dateKey: string;
      try {
        if (dateStr.includes("T")) {
          dateKey = format(parseISO(dateStr), "yyyy-MM-dd");
        } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          const [d, m, y] = dateStr.split("/");
          dateKey = `${y}-${m}-${d}`;
        } else {
          dateKey = dateStr.split(" ")[0]; // Take just the date part
        }
      } catch {
        dateKey = dateStr;
      }
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(item);
    });
    return map;
  }, [data, dateField]);

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold text-lg capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-ghost p-2">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-[var(--muted-foreground)] py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-lg overflow-hidden">
        {calendarDays.map((day, i) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const events = eventsByDate[dateKey] || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={i}
              className={cn(
                "min-h-[90px] p-1.5 bg-[var(--card)]",
                !inMonth && "opacity-40"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                today && "bg-brand-purple text-white",
                !today && "text-[var(--muted-foreground)]"
              )}>
                {format(day, "d")}
              </div>

              {events.slice(0, 3).map((event, j) => {
                const status = statusField ? (event[statusField] || "").toLowerCase() : "";
                const dotColor = STATUS_DOT[status] || "bg-brand-purple";

                return (
                  <button
                    key={j}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left px-1.5 py-0.5 mb-0.5 rounded text-[10px] bg-[var(--muted)] hover:bg-brand-purple/10 transition-colors truncate flex items-center gap-1"
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor)} />
                    {timeField && event[timeField] && (
                      <span className="text-[var(--muted-foreground)]">{event[timeField]}</span>
                    )}
                    <span className="truncate">{event[nameField] || "Sin nombre"}</span>
                  </button>
                );
              })}
              {events.length > 3 && (
                <p className="text-[10px] text-brand-purple font-medium px-1">
                  +{events.length - 3} más
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        {Object.entries(STATUS_DOT).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", color)} />
            <span className="text-xs text-[var(--muted-foreground)] capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
