"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

const COLORS = ["#8B5CF6", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444", "#D946EF", "#3B82F6"];

// ── Area Chart (conversations/leads per day) ──
export function DailyChart({ data, color = "#8B5CF6", label = "Registros" }: {
  data: { date: string; label: string; count: number }[];
  color?: string;
  label?: string;
}) {
  if (!data || data.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--foreground)",
          }}
          labelStyle={{ color: "var(--muted-foreground)", marginBottom: "4px" }}
          formatter={(value: any) => [value, label]}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${color.replace("#", "")})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Donut/Pie Chart (status distribution) ──
export function StatusDonut({ data }: {
  data: { name: string; value: number }[];
}) {
  if (!data || data.length === 0) return <EmptyChart />;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          label={({ name, value }) => `${name} (${Math.round(value / total * 100)}%)`}
          labelLine={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--foreground)",
          }}
          formatter={(value: any) => [value, "Registros"]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Bar Chart (roles distribution) ──
export function RolesBar({ data }: {
  data: { name: string; value: number }[];
}) {
  if (!data || data.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--foreground)",
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Heatmap (activity by hour/day) ──
export function ActivityHeatmap({ data }: {
  data: { hour: number; day: number; count: number }[];
}) {
  if (!data || data.length === 0) return <EmptyChart />;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Build a lookup
  const lookup: Record<string, number> = {};
  data.forEach(d => { lookup[`${d.day}-${d.hour}`] = d.count; });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Hour labels */}
        <div className="flex ml-10 mb-1">
          {hours.filter((_, i) => i % 3 === 0).map(h => (
            <div key={h} className="text-[9px] text-[var(--muted-foreground)]" style={{ width: `${100 / 8}%` }}>
              {h}:00
            </div>
          ))}
        </div>

        {/* Grid */}
        {days.map((dayName, dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px] text-[var(--muted-foreground)] w-8 text-right flex-shrink-0">
              {dayName}
            </span>
            <div className="flex-1 flex gap-0.5">
              {hours.map(hour => {
                const count = lookup[`${dayIdx}-${hour}`] || 0;
                const intensity = count / maxCount;
                return (
                  <div
                    key={hour}
                    className="flex-1 h-5 rounded-sm transition-colors"
                    style={{
                      backgroundColor: count === 0
                        ? "var(--muted)"
                        : `rgba(139, 92, 246, ${0.15 + intensity * 0.85})`,
                    }}
                    title={`${dayName} ${hour}:00 — ${count} mensajes`}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="text-[9px] text-[var(--muted-foreground)]">Menos</span>
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: intensity === 0
                  ? "var(--muted)"
                  : `rgba(139, 92, 246, ${0.15 + intensity * 0.85})`,
              }}
            />
          ))}
          <span className="text-[9px] text-[var(--muted-foreground)]">Más</span>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ──
export function KPICard({ label, value, change, icon, color, bgColor, suffix = "", prefix = "" }: {
  label: string;
  value: number | string;
  change?: number | null;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  suffix?: string;
  prefix?: string;
}) {
  return (
    <div className="card group hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${bgColor}`}>
          {icon}
        </div>
        {change !== null && change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${change >= 0 ? "text-success" : "text-danger"}`}>
            {change >= 0 ? "↑" : "↓"}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}</p>
      <p className="text-sm text-[var(--muted-foreground)] mt-1">{label}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[200px] text-sm text-[var(--muted-foreground)]">
      Sin datos suficientes para mostrar gráfica
    </div>
  );
}

// ── Top Contacts List ──
export function TopContacts({ data }: {
  data: { name: string; phone: string; count: number }[];
}) {
  if (!data || data.length === 0) return <EmptyChart />;

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((contact, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-brand-purple">
              {contact.name?.[0]?.toUpperCase() || "#"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium truncate">{contact.name || contact.phone}</span>
              <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0 ml-2">{contact.count} msgs</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-all"
                style={{ width: `${(contact.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

