export type AppRole = "admin" | "teacher" | "student" | "ADMIN" | "COACH" | "MEMBER" | string;

export const normalizeRole = (role?: AppRole | null) => String(role || "").toLowerCase();

export const isAdmin = (role?: AppRole | null) => normalizeRole(role) === "admin";

export const isTeacher = (role?: AppRole | null) => {
  const normalized = normalizeRole(role);
  return normalized === "teacher" || normalized === "coach";
};

export const isStudent = (role?: AppRole | null) => {
  const normalized = normalizeRole(role);
  return normalized === "student" || normalized === "member";
};

export const roleLabel = (role?: AppRole | null) => {
  if (isAdmin(role)) return "Administrador";
  if (isTeacher(role)) return "Profesor";
  if (isStudent(role)) return "Alumno";
  return String(role || "");
};
