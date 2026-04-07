"use client";

import { useState } from "react";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import { GripVertical, Eye, MoreVertical, Trash2, Edit } from "lucide-react";

interface KanbanProps {
  data: any[];
  statusField: string;
  nameField: string;
  dateField?: string;
  phoneField?: string;
  emailField?: string;
  columns: string[];
  onRowClick: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const COLUMN_COLORS: Record<string, string> = {
  nuevo: "border-t-brand-blue",
  contactado: "border-t-brand-cyan",
  cualificado: "border-t-brand-purple",
  ganado: "border-t-success",
  perdido: "border-t-danger",
  pendiente: "border-t-warning",
  confirmada: "border-t-brand-blue",
  completada: "border-t-success",
  cancelada: "border-t-danger",
  "no-show": "border-t-warning",
  activo: "border-t-success",
  inactivo: "border-t-[var(--muted-foreground)]",
};

const COLUMN_HEADER_COLORS: Record<string, string> = {
  nuevo: "bg-brand-blue/10 text-brand-blue",
  contactado: "bg-brand-cyan/10 text-brand-cyan",
  cualificado: "bg-brand-purple/10 text-brand-purple",
  ganado: "bg-success/10 text-success",
  perdido: "bg-danger/10 text-danger",
  pendiente: "bg-warning/10 text-warning",
  confirmada: "bg-brand-blue/10 text-brand-blue",
  completada: "bg-success/10 text-success",
  cancelada: "bg-danger/10 text-danger",
  "no-show": "bg-warning/10 text-warning",
  activo: "bg-success/10 text-success",
  inactivo: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export function KanbanBoard({
  data, statusField, nameField, dateField, phoneField, emailField,
  columns, onRowClick, onEdit, onDelete, canEdit, canDelete
}: KanbanProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Group data by status
  const grouped: Record<string, any[]> = {};
  columns.forEach(col => { grouped[col] = []; });
  data.forEach(row => {
    const status = (row[statusField] || "sin estado").toLowerCase();
    if (grouped[status]) {
      grouped[status].push(row);
    } else {
      // Put in first column if status not found
      const firstCol = columns[0];
      if (grouped[firstCol]) grouped[firstCol].push(row);
    }
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(colName => {
        const items = grouped[colName] || [];
        const headerColor = COLUMN_HEADER_COLORS[colName] || "bg-[var(--muted)] text-[var(--muted-foreground)]";
        const borderColor = COLUMN_COLORS[colName] || "border-t-[var(--muted-foreground)]";

        return (
          <div key={colName} className="flex-shrink-0 w-72">
            {/* Column Header */}
            <div className={cn("px-3 py-2 rounded-lg mb-3 flex items-center justify-between", headerColor)}>
              <span className="text-sm font-semibold capitalize">{colName}</span>
              <span className="text-xs font-bold bg-white/10 rounded-full w-6 h-6 flex items-center justify-center">
                {items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[200px]">
              {items.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-lg">
                  Sin registros
                </div>
              ) : (
                items.map((item, i) => (
                  <div
                    key={item.id || i}
                    className={cn(
                      "card p-3 border-t-2 cursor-pointer hover:shadow-lg transition-all group",
                      borderColor
                    )}
                    onClick={() => onRowClick(item)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-brand-purple">
                            {getInitials(item[nameField])}
                          </span>
                        </div>
                        <span className="text-sm font-medium truncate max-w-[160px]">
                          {item[nameField] || "Sin nombre"}
                        </span>
                      </div>

                      {(canEdit || canDelete) && (
                        <div className="relative">
                          <button
                            onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === item.id ? null : item.id); }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--muted)] transition-all"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {menuOpen === item.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(null); }} />
                              <div className="absolute right-0 top-full z-20 w-32 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-1">
                                {canEdit && onEdit && (
                                  <button
                                    onClick={e => { e.stopPropagation(); onEdit(item); setMenuOpen(null); }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--muted)] w-full"
                                  >
                                    <Edit className="w-3 h-3" /> Editar
                                  </button>
                                )}
                                {canDelete && onDelete && (
                                  <button
                                    onClick={e => { e.stopPropagation(); onDelete(item.id); setMenuOpen(null); }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-danger/5 w-full"
                                  >
                                    <Trash2 className="w-3 h-3" /> Eliminar
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {phoneField && item[phoneField] && (
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">{item[phoneField]}</p>
                    )}
                    {emailField && item[emailField] && (
                      <p className="text-xs text-[var(--muted-foreground)] mb-1 truncate">{item[emailField]}</p>
                    )}
                    {dateField && item[dateField] && (
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
                        {formatRelativeTime(item[dateField])}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
