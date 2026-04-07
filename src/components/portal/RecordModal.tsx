"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";

interface RecordModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (record: Record<string, any>) => Promise<void>;
  columns: { key: string; label: string; type?: string }[];
  initialData?: Record<string, any> | null;
  title: string;
}

export function RecordModal({ open, onClose, onSave, columns, initialData, title }: RecordModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      const empty: Record<string, any> = {};
      columns.forEach(c => { empty[c.key] = ""; });
      setFormData(empty);
    }
  }, [initialData, columns, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="btn-ghost p-1.5">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {columns.map(col => (
                <div key={col.key}>
                  <label className="block text-sm font-medium mb-1.5">{col.label}</label>
                  {col.type === "textarea" ? (
                    <textarea
                      className="input-field min-h-[80px] resize-y"
                      value={formData[col.key] || ""}
                      onChange={e => setFormData(p => ({ ...p, [col.key]: e.target.value }))}
                      placeholder={`Introduce ${col.label.toLowerCase()}`}
                    />
                  ) : col.type === "select" ? (
                    <select
                      className="input-field"
                      value={formData[col.key] || ""}
                      onChange={e => setFormData(p => ({ ...p, [col.key]: e.target.value }))}
                    >
                      <option value="">— Seleccionar —</option>
                      {(col as any).options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={col.type || "text"}
                      className="input-field"
                      value={formData[col.key] || ""}
                      onChange={e => setFormData(p => ({ ...p, [col.key]: e.target.value }))}
                      placeholder={`Introduce ${col.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Guardando..." : initialData ? "Guardar cambios" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
