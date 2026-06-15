import { apiGet } from "./api";
import { AppRole, isTeacher } from "./roles";

export type TeacherLite = {
  id: string;
  email: string;
  role: AppRole;
  fullName?: string;
  name?: string | null;
};

export type ClassSession = {
  id: string;
  startAt: string;
  endAt: string;
  capacity: number;
  reservedCount: number;
  waitlistCount: number;
  name: string;
  description: string;
  teacherId: string;
  teacher?: TeacherLite;
  bookingId?: string;
  bookedByMe?: boolean;
  myReservationStatus?: string;
  bookings: {
    id?: string;
    status?: string;
    studentId?: string;
    userId?: string;
    email?: string;
  }[];
};

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
  return [];
};

const value = (...values: any[]) => values.find((item) => item !== undefined && item !== null && item !== "");

const combineDateTime = (date?: string, time?: string) => {
  if (!date || !time) return undefined;
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
};

export const normalizeTeacher = (raw: any): TeacherLite | undefined => {
  if (!raw?.id) return undefined;
  return {
    id: String(raw.id),
    email: String(raw.email || ""),
    role: raw.role,
    fullName: raw.fullName || raw.full_name,
    name: raw.name || null,
  };
};

export const normalizeClassSession = (raw: any): ClassSession | null => {
  const template = raw.classTemplate || raw.class_template || raw.template || raw.activity;
  const teacher = normalizeTeacher(raw.teacher || raw.coach || template?.teacher || template?.coach)
    || (raw.coachId || raw.coach_id || raw.coachEmail || raw.coach_email
      ? {
          id: String(value(raw.coachId, raw.coach_id, "unassigned")),
          email: String(value(raw.coachEmail, raw.coach_email, "")),
          role: "COACH",
          name: value(raw.coachName, raw.coach_name, raw.coachEmail, raw.coach_email, null),
        }
      : undefined);

  const startAt = value(
    raw.startAt,
    raw.start_at,
    raw.startsAt,
    raw.starts_at,
    raw.startTime,
    raw.start_time,
    combineDateTime(raw.sessionDate || raw.session_date || raw.date, raw.startTime || raw.start_time)
  );

  const endAt = value(
    raw.endAt,
    raw.end_at,
    raw.endsAt,
    raw.ends_at,
    raw.endTime,
    raw.end_time,
    combineDateTime(raw.sessionDate || raw.session_date || raw.date, raw.endTime || raw.end_time)
  );

  if (!raw.id || !startAt || !endAt) return null;

  const normalizeBooking = (booking: any, fallbackStatus?: string) => {
    const user = booking?.user || booking?.member || booking?.student || booking?.customer || booking;
    return {
      id: booking?.id ? String(booking.id) : undefined,
      status: value(booking?.status, booking?.reservationStatus, booking?.reservation_status, fallbackStatus),
      studentId: value(booking?.studentId, booking?.student_id, booking?.student?.id),
      userId: value(booking?.userId, booking?.user_id, booking?.memberId, booking?.member_id, user?.id),
      email: value(booking?.email, booking?.userEmail, booking?.user_email, booking?.memberEmail, booking?.member_email, booking?.student?.email, user?.email),
    };
  };

  const bookings = [
    ...asArray(raw.bookings || raw.reservations || raw.enrollments).map((booking) => normalizeBooking(booking)),
    ...asArray(raw.reserved || raw.active || raw.attendees).map((booking) => normalizeBooking(booking, "ACTIVE")),
    ...asArray(raw.waitlist || raw.waiting).map((booking) => normalizeBooking(booking, "WAITLIST")),
  ];

  return {
    id: String(raw.id),
    startAt: String(startAt),
    endAt: String(endAt),
    capacity: Number(value(raw.capacity, raw.maxCapacity, raw.max_capacity, template?.capacity, 0)),
    reservedCount: Number(value(raw.reservedCount, raw.reserved_count, raw.bookedCount, raw.booked_count, raw.activeBookings, 0)),
    waitlistCount: Number(value(raw.waitlistCount, raw.waitlist_count, raw.waitingCount, raw.waiting_count, 0)),
    name: String(value(raw.name, raw.title, template?.name, raw.activity?.name, "Clase")),
    description: String(value(raw.description, template?.description, "")),
    teacherId: String(value(raw.teacherId, raw.teacher_id, raw.coachId, raw.coach_id, teacher?.id, "")),
    teacher,
    bookingId: value(
      raw.bookingId,
      raw.booking_id,
      raw.myBookingId,
      raw.my_booking_id,
      raw.currentUserBookingId,
      raw.reservationId,
      raw.reservation_id,
      raw.myReservationId,
      raw.my_reservation_id,
      raw.currentUserReservationId,
      raw.current_user_reservation_id,
      raw.myReservation?.id,
      raw.currentUserReservation?.id
    ),
    bookedByMe: Boolean(value(raw.bookedByMe, raw.booked_by_me, raw.reservedByMe, raw.reserved_by_me, raw.myBooking, raw.myReservation, raw.currentUserReservation)),
    myReservationStatus: value(
      raw.myReservationStatus,
      raw.my_reservation_status,
      raw.currentUserReservationStatus,
      raw.current_user_reservation_status,
      raw.bookingStatus,
      raw.reservationStatus,
      raw.reservation_status,
      raw.myReservation?.status,
      raw.currentUserReservation?.status
    ),
    bookings,
  };
};

export async function loadClassSessions() {
  const endpoints = ["/api/slots", "/api/class-sessions", "/api/sessions", "/api/classes"];

  for (const endpoint of endpoints) {
    try {
      const data = await apiGet(endpoint);
      const sessions = asArray(data).map(normalizeClassSession).filter((item): item is ClassSession => Boolean(item));
      if (sessions.length) return sessions;
    } catch {}
  }

  return [];
}

export async function loadTeachers() {
  const endpoints = [
    "/api/teachers",
    "/api/coaches",
    "/api/users?role=teacher",
    "/api/users?role=COACH",
    "/api/admin/users?role=teacher",
    "/api/admin/users?role=COACH",
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await apiGet(endpoint);
      const teachers = asArray(data)
        .map(normalizeTeacher)
        .filter((item): item is TeacherLite => Boolean(item && isTeacher(item.role)));
      if (teachers.length) return teachers;
    } catch {}
  }

  return [];
}
