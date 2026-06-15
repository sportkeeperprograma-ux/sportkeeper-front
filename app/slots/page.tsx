"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ApiError, apiDelete, apiGet, apiPost } from "../../lib/api";
import Button from "../../components/ui/Button";
import { useAuth } from "../../components/AuthContext";
import { ClassSession, TeacherLite, loadClassSessions, loadTeachers, normalizeClassSession } from "../../lib/classes";
import { isAdmin, isTeacher } from "../../lib/roles";

const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
type CalendarMode = "week" | "month";
type ReservationStatus = "ACTIVE" | "WAITLIST" | "BOOKED" | string;
type ReservationResponse = {
  id: string;
  status: ReservationStatus;
  message?: string;
};
type MyReservation = {
  slotId: string;
  status: ReservationStatus;
  slot?: ClassSession;
};
type CurrentUser = {
  id?: string;
  email?: string;
  [key: string]: any;
};
type MonthlyPlan = {
  contractedReservations?: number | null;
  contracted_reservations?: number | null;
  remainingReservations?: number | null;
  remaining_reservations?: number | null;
  usedReservations?: number | null;
  used_reservations?: number | null;
  [key: string]: any;
};

const pad = (n: number) => String(n).padStart(2, "0");
const formatYmdLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const addMonths = (d: Date, months: number) => new Date(d.getFullYear(), d.getMonth() + months, 1);
const getMonthMatrix = (anchor: Date) => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

const parseSlotDate = (value: string) => {
  if (value.endsWith("Z")) return new Date(value);
  return new Date(value.replace(" ", "T"));
};

const formatTime = (value: string) =>
  parseSlotDate(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const monthLabel = (date: Date) =>
  date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
const sameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
const currentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
};
const getMonthlyContractedClasses = (user: any) =>
  Number(
    firstValue(
      user?.contractedReservations,
      user?.contracted_reservations,
      user?.currentPlan?.contractedReservations,
      user?.currentPlan?.contracted_reservations,
      user?.monthlyPlan?.contractedReservations,
      user?.monthlyPlan?.contracted_reservations,
      user?.billingPlan?.contractedReservations,
      user?.billingPlan?.contracted_reservations,
      user?.plan?.contractedReservations,
      user?.plan?.contracted_reservations,
      user?.monthlyPlan?.contractedReservations,
      user?.monthlyPlan?.contracted_reservations,
      user?.activeMonthlyPlan?.contractedReservations,
      user?.activeMonthlyPlan?.contracted_reservations,
      user?.monthlyContractedClasses,
      user?.monthly_contracted_classes,
      user?.contractedClassesPerMonth,
      user?.contracted_classes_per_month,
      user?.monthlyContractedHours,
      user?.monthly_contracted_hours,
      user?.contractedHoursPerMonth,
      user?.contracted_hours_per_month,
      0
    )
  );

const loadMyMonthlyPlan = async (currentUser?: CurrentUser | null): Promise<MonthlyPlan | null> => {
  if (!currentUser) return null;
  const yearMonth = currentYearMonth();
  try {
    return await apiGet(`/api/me/billing/plans/${yearMonth}`);
  } catch {
    return null;
  }
};

const teacherName = (teacher: TeacherLite) => teacher.fullName || teacher.name || teacher.email || "Sin profesor";
const teacherInitial = (teacher: TeacherLite) => teacherName(teacher).slice(0, 1).toUpperCase();
const unassignedTeacher: TeacherLite = { id: "unassigned", email: "", role: "COACH", name: "Sin profesor asignado" };
const TEACHER_COLOR_STYLES = [
  {
    section: "border-violet-200 bg-violet-50/70",
    avatar: "from-violet-100 to-fuchsia-100 text-violet-700",
    badge: "bg-white text-violet-700 ring-1 ring-violet-200",
    slot: "border-l-4 border-l-violet-400",
  },
  {
    section: "border-teal-200 bg-teal-50/70",
    avatar: "from-teal-100 to-cyan-100 text-teal-700",
    badge: "bg-white text-teal-700 ring-1 ring-teal-200",
    slot: "border-l-4 border-l-teal-400",
  },
  {
    section: "border-amber-200 bg-amber-50/70",
    avatar: "from-amber-100 to-orange-100 text-amber-700",
    badge: "bg-white text-amber-700 ring-1 ring-amber-200",
    slot: "border-l-4 border-l-amber-400",
  },
  {
    section: "border-rose-200 bg-rose-50/70",
    avatar: "from-rose-100 to-pink-100 text-rose-700",
    badge: "bg-white text-rose-700 ring-1 ring-rose-200",
    slot: "border-l-4 border-l-rose-400",
  },
] as const;
const teacherStyleFor = (teacherId: string) => {
  const seed = teacherId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TEACHER_COLOR_STYLES[seed % TEACHER_COLOR_STYLES.length];
};

const slotTeacherId = (slot: ClassSession) => slot.teacherId || "unassigned";
const isActiveReservationStatus = (status?: string) => {
  const normalized = String(status || "ACTIVE").toUpperCase();
  return normalized === "ACTIVE" || normalized === "WAITLIST" || normalized === "BOOKED";
};
const sameId = (left?: string, right?: string) => Boolean(left && right && String(left) === String(right));
const sameEmail = (left?: string, right?: string) => Boolean(left && right && String(left).toLowerCase() === String(right).toLowerCase());
const asArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.slots)) return data.slots;
  if (Array.isArray(data?.timeSlots)) return data.timeSlots;
  if (Array.isArray(data?.classes)) return data.classes;
  if (Array.isArray(data?.reservations)) return data.reservations;
  if (Array.isArray(data?.bookings)) return data.bookings;
  if (Array.isArray(data?.active) || Array.isArray(data?.waiting)) {
    return [
      ...(data?.active || []).map((item: any) => ({ ...item, status: firstValue(item?.status, "ACTIVE") })),
      ...(data?.waiting || []).map((item: any) => ({ ...item, status: firstValue(item?.status, "WAITLIST") })),
    ];
  }
  if (Array.isArray(data?.reserved) || Array.isArray(data?.waitlist)) {
    return [
      ...(data?.reserved || []).map((item: any) => ({ ...item, status: firstValue(item?.status, "ACTIVE") })),
      ...(data?.waitlist || []).map((item: any) => ({ ...item, status: firstValue(item?.status, "WAITLIST") })),
    ];
  }
  return [];
};
const firstValue = (...values: any[]) => values.find((item) => item !== undefined && item !== null && item !== "");
const normalizeStatus = (status?: string) => String(status || "ACTIVE").toUpperCase();
const normalizeMyReservation = (raw: any): MyReservation | null => {
  const reservation = raw.reservation || raw.booking || raw.enrollment || raw;
  const slot = reservation.timeSlot || reservation.time_slot || reservation.slot || reservation.classSession || reservation.class_session || reservation.session || raw.timeSlot || raw.slot;
  const slotId = firstValue(
    reservation.timeSlotId,
    reservation.time_slot_id,
    reservation.timeSlotID,
    reservation.slotId,
    reservation.slot_id,
    reservation.classSessionId,
    reservation.class_session_id,
    reservation.sessionId,
    reservation.session_id,
    reservation.timeSlot?.id,
    reservation.slot?.id,
    reservation.classSession?.id,
    reservation.session?.id,
    raw.timeSlotId,
    raw.time_slot_id,
    raw.slotId,
    raw.slot_id,
    raw.classSessionId,
    raw.class_session_id,
    raw.sessionId,
    raw.session_id,
    raw.timeSlot?.id,
    raw.slot?.id,
    raw.classSession?.id,
    raw.session?.id,
    slot?.id
  );
  const status = firstValue(
    reservation.status,
    reservation.reservationStatus,
    reservation.reservation_status,
    reservation.bookingStatus,
    reservation.booking_status,
    raw.status,
    raw.reservationStatus,
    raw.reservation_status,
    raw.bookingStatus,
    raw.booking_status,
    "ACTIVE"
  );

  if (!slotId || !isActiveReservationStatus(status)) return null;
  const normalizedStatus = normalizeStatus(status);
  const normalizedSlot = slot
    ? normalizeClassSession({
        ...slot,
        id: firstValue(slot.id, slotId),
        bookedByMe: normalizedStatus !== "WAITLIST",
        myReservationStatus: normalizedStatus,
      })
    : null;

  return {
    slotId: String(slotId),
    status: normalizedStatus,
    slot: normalizedSlot || undefined,
  };
};

const getParticipantStatusForUser = (raw: any, currentUser: CurrentUser, fallbackStatus?: ReservationStatus) => {
  const participant = raw?.reservation || raw?.booking || raw?.enrollment || raw;
  const person = participant?.user || participant?.member || participant?.student || participant?.customer || participant;
  const email = firstValue(
    participant?.email,
    participant?.userEmail,
    participant?.user_email,
    participant?.memberEmail,
    participant?.member_email,
    participant?.studentEmail,
    participant?.student_email,
    person?.email
  );
  const userId = firstValue(
    participant?.userId,
    participant?.user_id,
    participant?.memberId,
    participant?.member_id,
    participant?.studentId,
    participant?.student_id,
    person?.id
  );
  const status = normalizeStatus(firstValue(participant?.status, participant?.reservationStatus, participant?.reservation_status, fallbackStatus));

  if (!isActiveReservationStatus(status)) return undefined;
  if (sameEmail(email, currentUser.email) || sameId(userId, currentUser.id)) return status;
  return undefined;
};

const getStatusFromSlotDetail = (data: any, currentUser: CurrentUser) => {
  const reserved = Array.isArray(data?.reserved) ? data.reserved : Array.isArray(data?.active) ? data.active : [];
  for (const item of reserved) {
    const status = getParticipantStatusForUser(item, currentUser, "ACTIVE");
    if (status) return status;
  }

  const waitlist = Array.isArray(data?.waitlist) ? data.waitlist : Array.isArray(data?.waiting) ? data.waiting : [];
  for (const item of waitlist) {
    const status = getParticipantStatusForUser(item, currentUser, "WAITLIST");
    if (status) return status;
  }

  for (const item of asArray(data)) {
    const status = getParticipantStatusForUser(item, currentUser);
    if (status) return status;
  }

  return undefined;
};

async function loadCurrentUserSlotStatus(slotId: string, currentUser: CurrentUser, includePrivilegedEndpoints = false) {
  const endpoints = [
    `/api/slots/${slotId}/reservations/me`,
    `/api/reservations/slot/${slotId}/me`,
    `/api/slots/${slotId}/my-reservation`,
    `/api/reservations/my/slot/${slotId}`,
    `/api/slots/${slotId}/reservations`,
    `/api/reservations/slot/${slotId}`,
    ...(includePrivilegedEndpoints ? [
      `/api/admin/slots/${slotId}/reservations`,
      `/api/teacher/slots/${slotId}/attendees`,
    ] : []),
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await apiGet(endpoint);
      const status = getStatusFromSlotDetail(data, currentUser);
      if (status) return status;
    } catch {}
  }

  return undefined;
}

async function loadStatusesFromSlotDetails(slots: ClassSession[], currentUser: CurrentUser, includePrivilegedEndpoints = false) {
  const entries = await Promise.all(
    slots.map(async (slot) => {
      const status = await loadCurrentUserSlotStatus(slot.id, currentUser, includePrivilegedEndpoints);
      return status ? ([slot.id, status] as const) : null;
    })
  );

  return Object.fromEntries(
    entries.filter((entry): entry is readonly [string, ReservationStatus] => Boolean(entry))
  );
}

async function loadMyReservations(currentUser?: CurrentUser) {
  const emailQuery = currentUser?.email ? `?email=${encodeURIComponent(currentUser.email)}` : "";
  const endpoints = [
    "/api/reservations/me",
    `/api/reservations/me${emailQuery}`,
    "/api/reservations/my",
    `/api/reservations/my${emailQuery}`,
    "/api/reservations/current-user",
    "/api/reservations/user/me",
    "/api/student/me/reservations",
    "/api/my-reservations",
    "/api/bookings/me",
    `/api/reservations${emailQuery}`,
    "/api/reservations",
  ].filter((endpoint, index, list) => endpoint && list.indexOf(endpoint) === index);

  const statuses: Record<string, ReservationStatus> = {};
  const slotsById = new Map<string, ClassSession>();

  for (const endpoint of endpoints) {
    try {
      const data = await apiGet(endpoint);
      const reservations = asArray(data).map(normalizeMyReservation).filter((item): item is MyReservation => Boolean(item));
      for (const reservation of reservations) {
        statuses[reservation.slotId] = reservation.status;
        if (reservation.slot) slotsById.set(reservation.slotId, reservation.slot);
      }
    } catch {}
  }

  return {
    statuses,
    slots: Array.from(slotsById.values()),
  };
}

export default function SlotsCalendarPage() {
  const [slots, setSlots] = useState<ClassSession[]>([]);
  const [teachers, setTeachers] = useState<TeacherLite[]>([]);
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan | null>(null);
  const [msg, setMsg] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("week");
  const [selectedDay, setSelectedDay] = useState(() => formatYmdLocal(new Date()));
  const [myReservationStatusBySlot, setMyReservationStatusBySlot] = useState<Record<string, ReservationStatus>>({});
  const { user } = useAuth();

  const load = async () => {
    try {
      const freshProfile = user ? await apiGet("/api/me").catch(() => user) : null;
      setProfile(freshProfile);
      setMonthlyPlan(await loadMyMonthlyPlan(freshProfile || user));
      const data = await loadClassSessions();
      const currentUser = freshProfile || user || undefined;
      const myReservations = await loadMyReservations(currentUser);
      const mergedSlots = Array.from(
        [...data, ...myReservations.slots].reduce((map, slot) => {
          const current = map.get(slot.id);

          if (!current) {
            map.set(slot.id, slot);
            return map;
          }

          map.set(slot.id, {
            ...current,
            ...slot,
            teacherId: slot.teacherId || current.teacherId,
            teacher: slot.teacher || current.teacher,
            name: slot.name || current.name,
            description: slot.description || current.description,
            capacity: slot.capacity || current.capacity,
            reservedCount: slot.reservedCount ?? current.reservedCount,
            waitlistCount: slot.waitlistCount ?? current.waitlistCount,
            bookings: slot.bookings.length ? slot.bookings : current.bookings,
          });

          return map;
        }, new Map<string, ClassSession>()).values()
      );
      const detailStatuses = currentUser
        ? await loadStatusesFromSlotDetails(mergedSlots, currentUser, isAdmin(currentUser.role) || isTeacher(currentUser.role))
        : {};
      setSlots(mergedSlots);
      setMyReservationStatusBySlot({ ...myReservations.statuses, ...detailStatuses });

      const apiTeachers = await loadTeachers();
      if (apiTeachers.length) {
        setTeachers(apiTeachers);
      } else {
        const teachersFromSlots = mergedSlots
          .map((slot) => slot.teacher)
          .filter((teacher): teacher is TeacherLite => Boolean(teacher));

        setTeachers(
          Array.from(new Map(teachersFromSlots.map((teacher) => [teacher.id, teacher])).values())
        );
      }
    } catch (e: any) {
      setMsg(e.message || "Error cargando slots");
    }
  };

  useEffect(() => {
    load();
  }, [user?.email, user?.id]);

  const reservar = async (slot: ClassSession) => {
    try {
      setLoadingId(slot.id);
      const response = await apiPost("/api/reservations", { timeSlotId: slot.id, email: user?.email }) as ReservationResponse;
      setMyReservationStatusBySlot((current) => ({ ...current, [slot.id]: response.status }));
      setMsg(response.status === "WAITLIST" ? "Estas en lista de espera" : response.message || "Plaza reservada");
      await load();
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 409) {
        const message = String(e.message || "");
        const conflictStatus = /espera|waitlist|waiting|lista/i.test(message)
          ? "WAITLIST"
          : "ACTIVE";

        setMyReservationStatusBySlot((current) => ({ ...current, [slot.id]: conflictStatus }));
        setMsg("Ya estas apuntado a esta clase. Ahora puedes cancelarla desde aqui.");
        await load();
        return;
      }

      setMsg(e.message || "No se pudo reservar");
    } finally {
      setLoadingId(null);
    }
  };

  const cancelarReserva = async (slot: ClassSession) => {
    try {
      setLoadingId(slot.id);
      const endpoints = [
        `/api/reservations/slot/${slot.id}`,
        slot.bookingId ? `/api/reservations/${slot.bookingId}` : "",
        slot.bookingId ? `/api/bookings/${slot.bookingId}` : "",
      ].filter(Boolean);

      let cancelled = false;
      let lastError: any;

      for (const endpoint of endpoints) {
        try {
          await apiDelete(endpoint);
          cancelled = true;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!cancelled) throw lastError || new Error("No se pudo cancelar la reserva");

      setMyReservationStatusBySlot((current) => {
        const next = { ...current };
        delete next[slot.id];
        return next;
      });
      setMsg("Reserva cancelada");
      await load();
    } catch (e: any) {
      setMsg(e.message || "No se pudo cancelar la reserva");
    } finally {
      setLoadingId(null);
    }
  };

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekAnchor, index)),
    [weekAnchor]
  );
  const monthDays = useMemo(() => getMonthMatrix(monthAnchor), [monthAnchor]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const slot of slots) {
      const key = formatYmdLocal(parseSlotDate(slot.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    for (const daySlots of map.values()) {
      daySlots.sort((a, b) => parseSlotDate(a.startAt).getTime() - parseSlotDate(b.startAt).getTime());
    }
    return map;
  }, [slots]);

  const selectedDaySlots = slotsByDay.get(selectedDay) || [];

  useEffect(() => {
    if (!user || !selectedDaySlots.length) return;

    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        selectedDaySlots.map(async (slot) => {
          const status = await loadCurrentUserSlotStatus(slot.id, user, isAdmin(user.role) || isTeacher(user.role));
          return status ? ([slot.id, status] as const) : null;
        })
      );

      if (cancelled) return;

      const found = entries.filter((entry): entry is readonly [string, ReservationStatus] => Boolean(entry));
      if (!found.length) return;

      setMyReservationStatusBySlot((current) => ({
        ...current,
        ...Object.fromEntries(found),
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDay, selectedDaySlots, user?.email, user?.id]);

  const teachersForCalendar = useMemo(() => {
    if (!selectedDaySlots.length) return [];

    const teachersById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
    const columns = new Map<string, TeacherLite>();

    for (const slot of selectedDaySlots) {
      const teacherId = slotTeacherId(slot);

      if (!teacherId || teacherId === "unassigned") {
        columns.set(unassignedTeacher.id, unassignedTeacher);
        continue;
      }

      columns.set(
        teacherId,
        slot.teacher || teachersById.get(teacherId) || {
          id: teacherId,
          email: "",
          role: "COACH",
          name: "Profesor",
        }
      );
    }

    return Array.from(columns.values());
  }, [teachers, selectedDaySlots]);

  const currentLabel = calendarMode === "week"
    ? `${days[0].getDate()} - ${days[6].getDate()} ${monthLabel(days[3])}`
    : monthLabel(monthAnchor);

  const goPrevious = () => {
    if (calendarMode === "week") setWeekAnchor(addDays(weekAnchor, -7));
    else setMonthAnchor(addMonths(monthAnchor, -1));
  };

  const goNext = () => {
    if (calendarMode === "week") setWeekAnchor(addDays(weekAnchor, 7));
    else setMonthAnchor(addMonths(monthAnchor, 1));
  };

  const goToday = () => {
    const today = new Date();
    setWeekAnchor(startOfWeek(today));
    setMonthAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(formatYmdLocal(today));
  };

  const isMyReservation = (slot: ClassSession) => {
    if (myReservationStatusBySlot[slot.id]) return true;
    if (slot.bookedByMe || slot.bookingId || slot.myReservationStatus) return true;
    return slot.bookings.some((booking) => {
      const active = isActiveReservationStatus(booking.status);
      return active && (sameEmail(booking.email, user?.email) || sameId(booking.studentId, user?.id) || sameId(booking.userId, user?.id));
    });
  };

  const getMyReservationStatus = (slot: ClassSession) => {
    if (myReservationStatusBySlot[slot.id]) return myReservationStatusBySlot[slot.id]?.toUpperCase();
    if (slot.myReservationStatus) return slot.myReservationStatus.toUpperCase();
    if (slot.bookedByMe || slot.bookingId) return "ACTIVE";
    return slot.bookings.find((booking) => {
      const active = isActiveReservationStatus(booking.status);
      return active && (sameEmail(booking.email, user?.email) || sameId(booking.studentId, user?.id) || sameId(booking.userId, user?.id));
    })?.status?.toUpperCase();
  };

  const myReservedSlots = useMemo(
    () =>
      slots
        .filter((slot) => Boolean(getMyReservationStatus(slot)) || isMyReservation(slot))
        .sort((a, b) => parseSlotDate(a.startAt).getTime() - parseSlotDate(b.startAt).getTime()),
    [myReservationStatusBySlot, slots, user?.email, user?.id]
  );
  const myConfirmedSlots = myReservedSlots.filter((slot) => getMyReservationStatus(slot) !== "WAITLIST");
  const myWaitlistSlots = myReservedSlots.filter((slot) => getMyReservationStatus(slot) === "WAITLIST");
  const currentMonth = new Date();
  const monthlyContractedClasses = getMonthlyContractedClasses(monthlyPlan || profile || user);
  const locallyUsedMonthlyClasses = myReservedSlots
    .filter((slot) => sameMonth(parseSlotDate(slot.startAt), currentMonth))
    .length;
  const usedMonthlyClasses = Number(
    firstValue(
      monthlyPlan?.usedReservations,
      monthlyPlan?.used_reservations,
      locallyUsedMonthlyClasses
    )
  );
  const remainingMonthlyClasses = Number(
    firstValue(
      monthlyPlan?.remainingReservations,
      monthlyPlan?.remaining_reservations,
      Math.max(0, monthlyContractedClasses - usedMonthlyClasses)
    )
  );
  const availableTeachers = useMemo(() => {
    const now = new Date();
    const teachersWithAvailableSlots = slots
      .filter((slot) => parseSlotDate(slot.startAt) >= now && (slot.reservedCount ?? 0) < slot.capacity)
      .map((slot) => slot.teacher)
      .filter((teacher): teacher is TeacherLite => Boolean(teacher));

    return Array.from(new Map(teachersWithAvailableSlots.map((teacher) => [teacher.id, teacher])).values());
  }, [slots]);

  const renderMyClassCard = (slot: ClassSession) => {
    const status = getMyReservationStatus(slot);
    const waitlist = status === "WAITLIST";
    const teacher = slot.teacher || (slot.teacherId ? { id: slot.teacherId, email: "", role: "COACH", name: "Profesor" } : undefined);

    return (
      <div key={slot.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{slot.name}</p>
            <p className="text-sm text-slate-600">
              {new Date(slot.startAt).toLocaleDateString()} · {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
            </p>
            {teacher && <p className="mt-1 text-xs font-medium text-slate-500">Profesor: {teacherName(teacher)}</p>}
            <p className={clsx("mt-1 text-xs font-semibold", waitlist ? "text-amber-700" : "text-green-700")}>
              {waitlist ? "En lista de espera" : "Reserva confirmada"}
            </p>
          </div>
          <Button
            variant="danger"
            loading={loadingId === slot.id}
            onClick={() => cancelarReserva(slot)}
            className="shrink-0"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Reservar clase</h1>
          <p className="mt-2 text-slate-500">Elige el dia y la hora que mejor se adapten a ti</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-11 w-11 rounded-md bg-white px-0 text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50"
              aria-label={calendarMode === "week" ? "Semana anterior" : "Mes anterior"}
              onClick={goPrevious}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Button>
            <Button
              variant="secondary"
              className="h-11 rounded-md bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50"
              onClick={goToday}
            >
              Hoy
            </Button>
            <div className="flex h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 2v4M16 2v4M3 10h18" />
                <rect x="3" y="4" width="18" height="18" rx="2" />
              </svg>
              <span className="capitalize">{currentLabel}</span>
            </div>
            <Button
              variant="secondary"
              className="h-11 w-11 rounded-md bg-white px-0 text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50"
              aria-label={calendarMode === "week" ? "Semana siguiente" : "Mes siguiente"}
              onClick={goNext}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Button>
          </div>

          <div className="flex rounded-md border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setCalendarMode("week")}
              className={clsx(
                "rounded px-4 py-2 text-sm font-semibold",
                calendarMode === "week" ? "bg-violet-50 text-[#6d3df2]" : "text-slate-800"
              )}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode("month")}
              className={clsx(
                "rounded px-4 py-2 text-sm font-semibold",
                calendarMode === "month" ? "bg-violet-50 text-[#6d3df2]" : "text-slate-800"
              )}
            >
              Mes
            </button>
          </div>

          <Button variant="secondary" className="h-11 rounded-md bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50">
            <svg viewBox="0 0 24 24" className="mr-2 size-4" fill="currentColor">
              <path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" />
            </svg>
            Filtrar
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Mis clases</h2>
            <p className="text-sm text-slate-500">Reservas activas y lista de espera.</p>
          </div>
          <Button variant="secondary" onClick={load}>Actualizar</Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">Contratadas este mes</div>
            <div className="mt-1 text-2xl font-bold text-slate-950">
              {monthlyContractedClasses ? `${monthlyContractedClasses} clases` : "Sin definir"}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">Usadas este mes</div>
            <div className="mt-1 text-2xl font-bold text-slate-950">{usedMonthlyClasses} clases</div>
          </div>
          <div className="rounded-md border border-violet-200 bg-violet-50 p-3">
            <div className="text-xs font-semibold uppercase text-[#6d3df2]">Disponibles</div>
            <div className="mt-1 text-2xl font-bold text-[#6d3df2]">
              {monthlyContractedClasses ? `${remainingMonthlyClasses} clases` : "Pendiente"}
            </div>
          </div>
        </div>

        {myReservedSlots.length ? (
          <div className="mt-4 space-y-5">
            {myConfirmedSlots.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-green-700">Reservadas</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {myConfirmedSlots.map(renderMyClassCard)}
                </div>
              </div>
            )}
            {myWaitlistSlots.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-amber-700">Lista de espera</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {myWaitlistSlots.map(renderMyClassCard)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Aun no tienes clases reservadas.
          </div>
        )}
      </section>

      {calendarMode === "week" ? (
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3 px-1">
          {days.map((day, index) => {
            const key = formatYmdLocal(day);
            const active = key === selectedDay;
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={clsx(
                  "min-w-[112px] snap-start rounded-lg border px-5 py-4 text-center shadow-sm transition",
                  active
                    ? "border-[#6d3df2] bg-[#6d3df2] text-white shadow-violet-200"
                    : "border-slate-200 bg-white text-slate-900 hover:border-violet-200"
                )}
              >
                <div className={clsx("text-sm", active ? "text-violet-100" : "text-slate-500")}>{WEEKDAYS[index]}</div>
                <div className="text-2xl font-bold leading-tight">{day.getDate()}</div>
                <div className={clsx("text-sm", active ? "text-violet-100" : "text-slate-500")}>
                  {day.toLocaleDateString("es-ES", { month: "short" })}
                </div>
              </button>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500">
            {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {monthDays.map((day) => {
              const key = formatYmdLocal(day);
              const active = key === selectedDay;
              const daySlots = slotsByDay.get(key) || [];
              const isCurrentMonth = day.getMonth() === monthAnchor.getMonth();
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={clsx(
                    "min-h-24 rounded-md border p-2 text-left transition",
                    active ? "border-[#6d3df2] bg-violet-50" : "border-slate-200 hover:border-violet-200",
                    isCurrentMonth ? "bg-white" : "bg-slate-50 text-slate-400"
                  )}
                >
                  <span className={clsx("text-sm font-semibold", active && "text-[#6d3df2]")}>{day.getDate()}</span>
                  <span className="mt-2 block text-xs text-slate-500">
                    {daySlots.length ? `${daySlots.length} clase${daySlots.length === 1 ? "" : "s"}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {msg && <p className="rounded-md bg-violet-50 px-4 py-3 text-sm font-medium text-[#6d3df2]">{msg}</p>}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Clases del dia</h2>
            <p className="text-sm text-slate-500">Vista simplificada para reservar o cancelar sin el calendario largo por horas.</p>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {selectedDaySlots.length ? `${selectedDaySlots.length} clase${selectedDaySlots.length === 1 ? "" : "s"}` : "Sin clases"}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {(teachersForCalendar.length ? teachersForCalendar : [unassignedTeacher]).map((teacher) => {
            const coachSlots = selectedDaySlots.filter((slot) => slotTeacherId(slot) === teacher.id);
            if (!coachSlots.length) return null;
            const teacherStyle = teacherStyleFor(teacher.id);

            return (
              <div key={teacher.id} className={clsx("rounded-lg border p-4", teacherStyle.section)}>
                <div className="mb-3 flex items-center gap-3">
                  <div className={clsx("grid size-9 place-items-center rounded-full bg-gradient-to-br text-xs font-bold", teacherStyle.avatar)}>
                    {teacherInitial(teacher)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-950">Profesor: {teacherName(teacher)}</div>
                    <div className="text-xs text-slate-500">{coachSlots.length} clase{coachSlots.length === 1 ? "" : "s"} en este dia</div>
                  </div>
                  <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", teacherStyle.badge)}>
                    Profesor
                  </span>
                </div>

                <div className="space-y-3">
                  {coachSlots.map((slot, index) => {
                    const rawMyStatus = getMyReservationStatus(slot);
                    const mine = Boolean(rawMyStatus) || isMyReservation(slot);
                    const myStatus = rawMyStatus || (mine ? "ACTIVE" : undefined);
                    const full = (slot.reservedCount ?? 0) >= slot.capacity;
                    const past = parseSlotDate(slot.startAt) < new Date();
                    const disabled = past;
                    const places = Math.max(0, slot.capacity - (slot.reservedCount ?? 0));
                    const reserveText = full ? "Apuntarme a lista de espera" : "Reservar plaza";
                    const cancelText = myStatus === "WAITLIST" ? "Cancelar espera" : "Cancelar reserva";

                    return (
                      <div
                        key={slot.id}
                        className={clsx(
                          "rounded-lg border px-4 py-3 shadow-sm transition",
                          disabled
                            ? "border-slate-200 bg-slate-100 text-slate-700"
                            : mine
                              ? "border-violet-300 bg-violet-50 text-slate-900"
                              : index % 2 === 0
                                ? "border-violet-200 bg-white hover:border-violet-300"
                                : "border-slate-200 bg-white hover:border-violet-200"
                          ,
                          teacherStyle.slot
                        )}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2">
                              <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-semibold", teacherStyle.badge)}>
                                {teacherName(teacher)}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-slate-950">{formatTime(slot.startAt)} - {formatTime(slot.endAt)}</div>
                            {slot.name && <div className="mt-1 text-sm font-medium text-slate-900">{slot.name}</div>}
                            <div className="mt-1 text-sm text-slate-600">
                              {mine
                                ? myStatus === "WAITLIST" ? "Estas en lista de espera" : "Reserva confirmada"
                                : disabled
                                  ? "No disponible"
                                  : `${places} plaza${places === 1 ? "" : "s"} libre${places === 1 ? "" : "s"}`}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                              <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{slot.reservedCount}/{slot.capacity} reservas</span>
                              {slot.waitlistCount > 0 && <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">{slot.waitlistCount} en espera</span>}
                            </div>
                          </div>

                          {!disabled && (
                            <div className="flex shrink-0 gap-2">
                              {!mine && (
                                <button
                                  type="button"
                                  disabled={loadingId === slot.id}
                                  onClick={() => reservar(slot)}
                                  className={clsx(
                                    "rounded-md px-3 py-2 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
                                    full ? "bg-violet-50 text-[#6d3df2] ring-1 ring-violet-200" : "bg-[#6d3df2] text-white hover:bg-[#5d2ee0]"
                                  )}
                                >
                                  {reserveText}
                                </button>
                              )}
                              {mine && (
                                <button
                                  type="button"
                                  disabled={loadingId === slot.id}
                                  onClick={() => cancelarReserva(slot)}
                                  className="rounded-md bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {cancelText}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!selectedDaySlots.length && (
            <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No hay clases en el dia seleccionado.
            </div>
          )}
        </div>
      </div>

      {availableTeachers.length > 0 && (
        <div className="flex flex-col gap-4 rounded-lg bg-violet-50/80 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-md bg-violet-100 text-[#6d3df2]">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-950">Profesores con clases disponibles</h2>
              <p className="text-sm text-slate-500">
                {availableTeachers.map(teacherName).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
