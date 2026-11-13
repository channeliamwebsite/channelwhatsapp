"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** New contacts per day, aggregated from stored contact createdAt dates. */
export function ContactGrowthChart({ data }: { data: { date: string; label: string; contacts: number }[] }) {
  return (
    <div>
      <div className="h-[220px] w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => [v, "New contacts"]} />
            <Bar dataKey="contacts" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>New contacts per day</caption>
        <tbody>{data.map((d) => <tr key={d.date}><th scope="row">{d.label}</th><td>{d.contacts}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
