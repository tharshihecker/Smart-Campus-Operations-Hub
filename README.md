# Smart Campus Operations Hub

**IT3030 PAF Assignment 2026 – NUSLIIT JFN3**

A production-inspired full-stack web system for university campus operations management, built with **Spring Boot** (backend) and **React** (frontend).

---

## 🚀 Quick Start

### Prerequisites
- Java 21
- Maven 3.9+
- Node.js 18+
- MySQL 8.0

### 1. Database Setup
```sql
CREATE DATABASE paf;
```

### 2. Backend
```bash
cd backend
mvn spring-boot:run
```
The backend starts on `http://localhost:8080`  
*(Schema auto-created via `ddl-auto: update`; sample data seeded on startup)*

### 3. Frontend
```bash
cd frontend
npm install
npm start
```
The React app starts on `http://localhost:3000`

---

## 🔐 Default Credentials

| Role        | Username      | Password   |
|-------------|---------------|------------|
| Admin       | `admin`       | `admin123` |
| Technician  | `techsupport` | `tech123`  |
| Demo User   | `demouser`    | `user123`  |

Admin Portal: `http://localhost:3000/admin`

---

## 📦 System Modules

### Module A – Facilities & Assets Catalogue
- Bookable resources: lecture halls, labs, meeting rooms, equipment
- Metadata: type, capacity, location, availability windows, status (ACTIVE / MAINTENANCE / OUT_OF_SERVICE)
- Search & filter by type, capacity, location

### Module B – Booking Management
- Booking workflow: `PENDING → APPROVED/REJECTED`; approved can be `CANCELLED`
- **Conflict detection** prevents overlapping bookings for the same resource
- Admin approval/rejection with reasons; users see only their bookings

### Module C – Maintenance & Incident Ticketing
- File-based incident reports with up to **3 image attachments**
- Status workflow: `OPEN → IN_PROGRESS → RESOLVED → CLOSED` (or `REJECTED`)
- Technician assignment; resolution notes; comment thread with ownership (edit/delete own)

### Module D – Notifications
- Automatic notifications on booking approval/rejection and ticket status changes
- Real-time unread badge on notification bell (30s polling)
- Mark individual or all-read; delete; filter by READ/UNREAD

### Module E – Authentication & Authorization
- **JWT-based** authentication (24h expiry)
- Roles: `USER`, `TECHNICIAN`, `ADMIN`
- Role-based access control on all API endpoints

---

## 🏗 Architecture

```
Frontend (React)            Backend (Spring Boot)          Database (MySQL)
─────────────────           ──────────────────────         ───────────────
UserApp / AdminApp  ──HTTP/JWT──►  REST API (port 8080)  ──JPA──►  MySQL DB
                                  Layered: Controller
                                           Service
                                           Repository
```

---

## 📡 Key API Endpoints

### Auth
| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| POST   | `/api/user/signup`    | Register (returns JWT) |
| POST   | `/api/user/login`     | Login (returns JWT)    |

### Facilities
| Method | Endpoint                      | Description           |
|--------|-------------------------------|-----------------------|
| GET    | `/api/facilities`             | List with filters     |
| GET    | `/api/facilities/{id}`        | Get by ID             |
| POST   | `/api/admin/facilities`       | Create (Admin)        |
| PUT    | `/api/admin/facilities/{id}`  | Update (Admin)        |
| DELETE | `/api/admin/facilities/{id}`  | Delete (Admin)        |

### Bookings
| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| POST   | `/api/bookings`                       | Create booking           |
| GET    | `/api/bookings/user/{userId}`         | My bookings              |
| PUT    | `/api/bookings/{id}/cancel`           | Cancel booking           |
| PUT    | `/api/admin/bookings/{id}/status`     | Approve/Reject (Admin)   |

### Incidents
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | `/api/incidents`                  | Create ticket + files    |
| GET    | `/api/incidents`                  | My tickets               |
| GET    | `/api/admin/incidents`            | All tickets (Admin)      |
| PUT    | `/api/admin/incidents/{id}/status`| Update status (Admin)    |
| PUT    | `/api/admin/incidents/{id}/assign`| Assign technician (Admin)|
| POST   | `/api/incidents/{id}/comments`    | Add comment              |
| DELETE | `/api/incidents/comments/{id}`    | Delete own comment       |

### Notifications
| Method | Endpoint                          | Description        |
|--------|-----------------------------------|--------------------|
| GET    | `/api/notifications`              | My notifications   |
| GET    | `/api/notifications/unread-count` | Unread count       |
| PUT    | `/api/notifications/{id}/read`    | Mark read          |
| PUT    | `/api/notifications/mark-all-read`| Mark all read      |
| DELETE | `/api/notifications/{id}`         | Delete             |

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
mvn test
```
Tests use H2 in-memory DB (no MySQL required for tests).

### Test Coverage
- `BookingServiceTest` – conflict detection, capacity check, cancel authorization, date validation

---

## 🔄 CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):
- **Backend**: Build, run tests with MySQL service container
- **Frontend**: Install dependencies, run tests, build production bundle

---

## 📁 Project Structure

```
├── backend/
│   ├── src/main/java/com/sliit/smartcampus/
│   │   ├── booking/       # Module B: Booking management
│   │   ├── config/        # SecurityConfig, DataInitializer, WebConfig
│   │   ├── exception/     # GlobalExceptionHandler, ResourceNotFoundException
│   │   ├── facility/      # Module A: Facilities catalogue
│   │   ├── incident/      # Module C: Incident ticketing
│   │   ├── notification/  # Module D: Notifications
│   │   ├── security/      # JWT utilities and filter
│   │   └── user/          # Module E: Auth & user management
│   └── src/test/
└── frontend/
    ├── src/
    │   ├── admin/         # Admin portal pages
    │   │   ├── ManageIncidents.js
    │   │   ├── ManageBookings.js
    │   │   └── ...
    │   └── user/          # User portal pages
    │       ├── Incidents.js
    │       ├── Notifications.js
    │       └── ...
    └── package.json
```

---

## 👥 Team Contribution

| Member | Modules Implemented |
|--------|---------------------|
| Member 1 | Module A – Facilities & Assets (FacilityController, FacilityService, FacilityRepository, FacilitiesAdmin.js, Facilities.js) |
| Member 2 | Module B – Booking Management (BookingController, BookingService, conflict detection, ManageBookings.js, MyBookings.js) |
| Member 3 | Module C – Incident Ticketing (IncidentTicketController, IncidentTicketService, file upload, comments, Incidents.js, ManageIncidents.js) |
| Member 4 | Module D+E – Notifications & Auth (NotificationService, JWT security, SecurityConfig, UserController, Notifications.js) |
