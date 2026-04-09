const API_BASE = "http://localhost:8080/api";

/* ── Auth helpers ─────────────────────────────────────── */
export function getToken() { return localStorage.getItem('smartcampus_token'); }
export function setToken(token) { localStorage.setItem('smartcampus_token', token); }
export function clearToken() { localStorage.removeItem('smartcampus_token'); }
export function getAuthHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export function getCurrentUserId() {
  return localStorage.getItem('smartcampus_user_id');
}
export function setCurrentUserId(userId) {
  localStorage.setItem('smartcampus_user_id', userId);
}
export function getCurrentUserRole() {
  return localStorage.getItem('smartcampus_user_role');
}
export function setCurrentUserRole(role) {
  localStorage.setItem('smartcampus_user_role', role);
}
export function isAdmin() {
  return getCurrentUserRole() === 'ADMIN';
}
export function isTechnician() {
  return getCurrentUserRole() === 'TECHNICIAN';
}
export function isRegularUser() {
  return getCurrentUserRole() === 'USER' || getCurrentUserRole() === 'STAFF';
}

/* ── Core fetch helpers ───────────────────────────────── */
async function request(path, data) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw parseErrorResponse(text);
  }
  const ct = res.headers.get("content-type");
  return ct?.includes("application/json") ? res.json() : res.text();
}

async function fetchJson(path) {
  const headers = { ...getAuthHeader() };
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw parseErrorResponse(text);
  }
  return res.json();
}

async function sendJson(method, path, data) {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
    credentials: 'include', // Allow cookies if needed
  });
  if (!res.ok) {
    const text = await res.text();
    throw parseErrorResponse(text);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type");
  return ct?.includes("application/json") ? res.json() : res.text();
}

function parseErrorResponse(text) {
  try {
    const json = JSON.parse(text);
    // Handle Spring Boot error response format
    if (json.message) {
      return new Error(json.message);
    }
    if (json.error) {
      return new Error(json.error);
    }
  } catch (e) {
    // Not JSON, use raw text
  }
  // Clean up HTML error pages
  if (text.includes("<html>") || text.includes("<!DOCTYPE")) {
    return new Error("Server error - please try again later");
  }
  return new Error(text || "Request failed");
}

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

/* ── Auth ─────────────────────────────────────────────── */
export async function signup(data) {
  const response = await request("/user/signup", data);
  if (response && response.token) {
    setToken(response.token);
    setCurrentUserId(response.userId);
  }
  return response;
}

export async function login(data) {
  const response = await request("/user/login", data);
  if (response && response.token) {
    setToken(response.token);
    setCurrentUserId(response.userId);
  }
  return response;
}

/**
 * Google OAuth 2.0 login – sends the Google access token to our backend.
 * The backend verifies via Google's userinfo endpoint.
 * @param {string} accessToken – from @react-oauth/google implicit flow
 */
export async function googleLogin(accessToken) {
  const response = await request("/auth/google", { accessToken });
  if (response && response.token) {
    setToken(response.token);
    setCurrentUserId(response.userId);
  }
  return response;
}

export function logout() {
  clearToken();
  localStorage.removeItem('smartcampus_user_id');
  localStorage.removeItem('smartcampus_username');
  localStorage.removeItem('smartcampus_role');
  localStorage.removeItem('smartcampus_full_name');
}

export function isLoggedIn() {
  return !!getToken();
}

/* ── User Profile ────────────────────────────────────── */
export async function fetchProfile(userId) { return fetchJson(`/user/profile/${userId}`); }
export async function updateProfile(userId, data) { return sendJson("PUT", `/user/profile/${userId}`, data); }
export async function changePassword(userId, data) { return sendJson("PUT", `/user/change-password/${userId}`, data); }
export async function updateNotificationPrefs(userId, prefs) {
  return sendJson("PUT", `/user/notification-prefs/${userId}`, prefs);
}

/* ── Home Dashboard ──────────────────────────────────── */
export async function fetchHomeSummary() { return fetchJson("/home/summary"); }

/* ── Events ──────────────────────────────────────────── */
export async function fetchEvents() { return fetchJson("/events"); }

/* ── Resources ───────────────────────────────────────── */
export async function fetchResources() { return fetchJson("/resources"); }

/* ── Services ────────────────────────────────────────── */
export async function fetchServices() { return fetchJson("/services"); }

/* ── Facilities ───────────────────────────────────────── */
export async function fetchFacilities(filters = {}) { return fetchJson(`/facilities${buildQuery(filters)}`); }
export async function fetchFacilityById(id) { return fetchJson(`/facilities/${id}`); }
export async function fetchFacilityTypes() { return fetchJson("/facilities/metadata/types"); }
export async function fetchFacilityStatuses() { return fetchJson("/facilities/metadata/statuses"); }

/* Admin Facilities */
export async function createFacility(data) { return sendJson("POST", "/admin/facilities", data); }
export async function updateFacility(id, data) { return sendJson("PUT", `/admin/facilities/${id}`, data); }
export async function deleteFacility(id) { return sendJson("DELETE", `/admin/facilities/${id}`); }

/* ── Bookings (user) ──────────────────────────────────── */
export async function createBooking(data) { return sendJson("POST", "/bookings", data); }
export async function updateBooking(bookingId, data) { return sendJson("PUT", `/bookings/${bookingId}`, data); }
export async function fetchUserBookings(userId) { return fetchJson(`/bookings/user/${userId}`); }
export async function fetchFacilityBookings(facilityId) { return fetchJson(`/bookings/facility/${facilityId}`); }


export async function cancelBooking(bookingId, userId) { return sendJson("PUT", `/bookings/${bookingId}/cancel?userId=${userId}`); }
export async function fetchBookingQR(bookingId) { return fetchJson(`/bookings/${bookingId}/qr`); }
export async function checkinBooking(bookingId, userId) {
  return sendJson("POST", `/bookings/${bookingId}/checkin?userId=${userId}`);
}

/**
 * Returns all active (PENDING/APPROVED/CHECKED_IN) bookings for a facility on a specific date.
 * Used by the frontend BookingPanel to locally compute seat usage per time slot.
 */
export async function fetchFacilityBookingsByDate(facilityId, date) {
  return fetchJson(`/bookings/facility/${facilityId}?date=${date}`);
}

/**
 * Calls the dedicated availability endpoint: returns totalCapacity, usedSeats, remainingSeats,
 * availableFrom, availableTo for a specific facility + date + time window.
 */
export async function fetchFacilityAvailability(facilityId, date, startTime, endTime) {
  return fetchJson(
    `/bookings/facility/${facilityId}/availability?date=${date}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
  );
}

/* ── Bookings (admin) ─────────────────────────────────── */
export async function fetchAllBookings(status) {
  const q = status ? `?status=${status}` : "";
  return fetchJson(`/admin/bookings${q}`);
}
export async function updateBookingStatus(bookingId, status, adminRemarks) {
  return sendJson("PUT", `/admin/bookings/${bookingId}/status`, { status, adminRemarks });
}
export async function deleteBooking(bookingId) { return sendJson("DELETE", `/admin/bookings/${bookingId}`); }
export async function fetchBookingStatuses() { return fetchJson("/admin/bookings/statuses"); }

/* ── Admin: Users ─────────────────────────────────────── */
export async function fetchAllUsers(q) {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return fetchJson(`/admin/users${query}`);
}
export async function fetchUserById(id) { return fetchJson(`/admin/users/${id}`); }
export async function updateUserRole(id, role) { return sendJson("PUT", `/admin/users/${id}/role`, { role }); }
export async function toggleUserStatus(id) { return sendJson("PUT", `/admin/users/${id}/toggle-status`); }
export async function deleteUser(id) { return sendJson("DELETE", `/admin/users/${id}`); }
export async function fetchUserRoles() { return fetchJson("/admin/users/roles"); }
export async function fetchUserStats() { return fetchJson("/admin/users/stats"); }

/* ── Admin: Analytics ─────────────────────────────────── */
export async function fetchAnalytics() { return fetchJson("/admin/analytics"); }

/* ── Admin: Events ────────────────────────────────────── */
export async function fetchAdminEvents() { return fetchJson("/admin/events"); }
export async function createEvent(data) { return sendJson("POST", "/admin/events", data); }
export async function updateEvent(id, data) { return sendJson("PUT", `/admin/events/${id}`, data); }
export async function deleteEvent(id) { return sendJson("DELETE", `/admin/events/${id}`); }

export async function createEventBooking(eventId, data) { return sendJson("POST", `/events/${eventId}/book`, data); }
export async function fetchUserEventBookings(userId) { return fetchJson(`/events/bookings/user/${userId}`); }
export async function cancelEventBooking(bookingId, userId) { return sendJson("PUT", `/events/bookings/${bookingId}/cancel?userId=${userId}`); }
export async function scanEventBookingByToken(token) { return fetchJson(`/events/bookings/scan/${encodeURIComponent(token)}`); }
export async function confirmEventCheckin(token) { 
  const adminId = getCurrentUserId(); 
  return sendJson("POST", "/events/bookings/scan", { token, adminId }); 
}

export async function fetchEventAvailability(eventId) { return fetchJson(`/events/${eventId}/availability`); }
export async function uploadEventImage(file) {
  const headers = { ...getAuthHeader() };
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/admin/events/upload-image`, {
    method: 'POST',
    headers,
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text(); throw parseErrorResponse(t);
  }
  return res.json();
}
/* ── Admin: Services ──────────────────────────────────── */
export async function fetchAdminServices() { return fetchJson("/admin/services"); }
export async function createService(data) { return sendJson("POST", "/admin/services", data); }
export async function updateService(id, data) { return sendJson("PUT", `/admin/services/${id}`, data); }
export async function deleteService(id) { return sendJson("DELETE", `/admin/services/${id}`); }

/* ── Admin: Resources ─────────────────────────────────── */
export async function fetchAdminResources() { return fetchJson("/admin/resources"); }
export async function createResource(data) { return sendJson("POST", "/admin/resources", data); }
export async function updateResource(id, data) { return sendJson("PUT", `/admin/resources/${id}`, data); }
export async function deleteResource(id) { return sendJson("DELETE", `/admin/resources/${id}`); }

/* ── Incidents (user) ─────────────────────────────────── */
export async function fetchMyIncidents() { return fetchJson("/incidents"); }
export async function fetchIncidentById(id) { return fetchJson(`/incidents/${id}`); }

export async function createIncident(formData) {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: "POST",
    headers: getAuthHeader(),
    body: formData,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || "Failed"); }
  return res.json();
}

/* ── Technician: Assigned Incidents ───────────────────────── */
export async function fetchTechnicianAssignedIncidents() {
  return fetchJson("/incidents/assigned");
}

export async function fetchIncidentComments(id) { return fetchJson(`/incidents/${id}/comments`); }
export async function addIncidentComment(id, content) { return sendJson("POST", `/incidents/${id}/comments`, { content }); }
export async function editIncidentComment(commentId, content) { return sendJson("PUT", `/incidents/comments/${commentId}`, { content }); }
export async function deleteIncidentComment(commentId) { return sendJson("DELETE", `/incidents/comments/${commentId}`); }
export async function deleteIncident(id) { return sendJson("DELETE", `/incidents/${id}`); }

/* ── Incidents (admin) ────────────────────────────────── */
export async function fetchAllIncidents(filters = {}) { return fetchJson(`/admin/incidents${buildQuery(filters)}`); }
export async function updateIncidentStatus(id, status, resolutionNotes, rejectionReason) {
  return sendJson("PUT", `/admin/incidents/${id}/status`, { status, resolutionNotes, rejectionReason });
}
export async function assignIncidentTechnician(id, technicianId) {
  return sendJson("PUT", `/admin/incidents/${id}/assign`, { technicianId });
}
export async function addAdminIncidentComment(id, content, adminId) {
  return sendJson("POST", `/admin/incidents/${id}/comments?adminId=${adminId}`, { content });
}
export async function deleteAdminIncidentComment(commentId, adminId) {
  return sendJson("DELETE", `/admin/incidents/comments/${commentId}?adminId=${adminId}`);
}
export async function fetchIncidentStatuses() { return fetchJson("/admin/incidents/statuses"); }
export async function fetchIncidentPriorities() { return fetchJson("/admin/incidents/priorities"); }

/* ── Notifications ────────────────────────────────────── */
export async function fetchNotifications() { return fetchJson("/notifications"); }
export async function fetchUnreadCount() { return fetchJson("/notifications/unread-count"); }
export async function markNotificationRead(id) { return sendJson("PUT", `/notifications/${id}/read`); }
export async function markAllNotificationsRead() { return sendJson("PUT", "/notifications/mark-all-read"); }
export async function deleteNotification(id) { return sendJson("DELETE", `/notifications/${id}`); }
