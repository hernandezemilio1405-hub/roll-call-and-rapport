import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Criterion = Database["public"]["Tables"]["criteria"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type Participation = Database["public"]["Tables"]["participations"]["Row"];
export type GroupWithCount = Group & { student_count: number };

const PAGE = 1000;

/** Pages through results so long periods are never cut at the 1000-row API limit. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export const groupsQuery = () =>
  queryOptions({
    queryKey: ["groups"],
    queryFn: async (): Promise<GroupWithCount[]> => {
      const { data, error } = await supabase
        .from("groups")
        .select("*, students(count)")
        .order("name");
      if (error) throw error;
      return (data ?? []).map((g) => {
        const { students, ...rest } = g as Group & { students: { count: number }[] };
        return { ...rest, student_count: students?.[0]?.count ?? 0 };
      });
    },
  });

export const groupQuery = (id: string) =>
  queryOptions({
    queryKey: ["groups", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const studentsQuery = (groupId: string) =>
  queryOptions({
    queryKey: ["students", groupId],
    queryFn: () =>
      fetchAll<Student>((from, to) =>
        supabase
          .from("students")
          .select("*")
          .eq("group_id", groupId)
          .order("full_name")
          .range(from, to),
      ),
    enabled: !!groupId,
  });

export const studentQuery = (id: string) =>
  queryOptions({
    queryKey: ["student", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, groups(id, name, grade)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const criteriaQuery = () =>
  queryOptions({
    queryKey: ["criteria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criteria")
        .select("*")
        .order("active", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

interface RangeFilter {
  groupId?: string;
  studentId?: string;
  from: string;
  to: string;
}

export const attendanceQuery = (f: RangeFilter) =>
  queryOptions({
    queryKey: ["attendance", f.groupId ?? null, f.studentId ?? null, f.from, f.to],
    queryFn: () =>
      fetchAll<Attendance>((from, to) => {
        let q = supabase.from("attendance").select("*").gte("date", f.from).lte("date", f.to);
        if (f.groupId) q = q.eq("group_id", f.groupId);
        if (f.studentId) q = q.eq("student_id", f.studentId);
        return q.order("date", { ascending: false }).order("id").range(from, to);
      }),
    enabled: !!(f.groupId || f.studentId),
  });

export const participationsQuery = (f: RangeFilter) =>
  queryOptions({
    queryKey: ["participations", f.groupId ?? null, f.studentId ?? null, f.from, f.to],
    queryFn: () =>
      fetchAll<Participation>((from, to) => {
        let q = supabase.from("participations").select("*").gte("date", f.from).lte("date", f.to);
        if (f.groupId) q = q.eq("group_id", f.groupId);
        if (f.studentId) q = q.eq("student_id", f.studentId);
        return q
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to);
      }),
    enabled: !!(f.groupId || f.studentId),
  });

export const overviewQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: ["overview", from, to],
    queryFn: async () => {
      const [att, par] = await Promise.all([
        fetchAll<Pick<Attendance, "group_id" | "student_id" | "status" | "date">>((a, b) =>
          supabase
            .from("attendance")
            .select("group_id, student_id, status, date")
            .gte("date", from)
            .lte("date", to)
            .order("id")
            .range(a, b),
        ),
        fetchAll<Pick<Participation, "group_id" | "student_id" | "points">>((a, b) =>
          supabase
            .from("participations")
            .select("group_id, student_id, points")
            .gte("date", from)
            .lte("date", to)
            .order("id")
            .range(a, b),
        ),
      ]);
      return { attendance: att, participations: par };
    },
  });

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Ocurrió un error inesperado";
}
