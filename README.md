<div align="center">
Smart Campus Operations Hub
</div>
<div align="center">


### Faculty of Computing - SLIIT

[![Spring Boot](https://img.shields.io/badge/Backend-Spring_Boot_3.4.2-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](./backend)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=0B2239)](./frontend)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](./backend/src/main/resources/application.yml)
[![GitHub Actions](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](./.github/workflows/ci.yml)

</div>

## Overview

Smart Campus Operations Hub is a full-stack university operations platform built for the IT3030 Programming Applications and Frameworks group assignment. The system combines facility and asset booking, maintenance and incident handling, notifications, authentication, and admin operations in one web application.

This repository contains:

- A Spring Boot REST API for business logic, validation, security, and persistence
- A React client web application for students, staff, technicians, and administrators
- Role-based workflows for bookings, incidents, notifications, and campus operations
- Value-added features such as QR check-in, waitlist management, analytics, event bookings, and seeded demo data



## Business Scenario

The university requires a centralized Smart Campus Operations Hub to manage:

- Facilities and assets catalogue
- Resource booking workflows
- Maintenance and incident ticket handling
- Notifications for operational updates
- Secure authentication and role-based authorization

## Implemented Modules

### Core assignment modules

#### Module A - Facilities and Assets Catalogue

- Manage facilities and bookable resources
- Resource types include lecture halls, labs, meeting rooms, projectors, and cameras
- Metadata includes capacity, location, available time window, description, and current status
- Search and filter support for type, status, location, and capacity

#### Module B - Booking Management

- Users can create resource booking requests
- Booking workflow includes `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, and check-in related flows
- Conflict detection prevents overlapping bookings for the same facility
- Admin users can approve, reject, delete, or counter-propose booking requests
- Users can view, update, cancel, and check in to their own bookings

#### Module C - Maintenance and Incident Ticketing

- Users can create incident tickets with priority, category, location, and contact details
- Supports up to 3 image attachments through multipart upload
- Status workflow includes `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, and `REJECTED`
- Admin can assign technicians, update status, add notes, and moderate incident operations
- Users and admins can add comments, with ownership rules for edit/delete actions

#### Module D - Notifications

- In-app notifications for booking changes, incident updates, and comment activity
- Unread count badge in both user and admin portals
- Mark single notification as read, mark all as read, or delete notifications
- Frontend polling updates notification state in the UI

#### Module E - Authentication and Authorization

- Username/password login and signup
- Google sign-in integration through backend token verification
- JWT-based authentication for protected API access
- Role-based access for `USER`, `TECHNICIAN`, and `ADMIN`
- Separate user portal and admin portal route protection

### Value-added features beyond the minimum

- Event management and event booking
- Event QR check-in flow
- Waitlist handling for bookings
- Admin analytics dashboard
- Learning resources module
- Campus services module
- Seeded demo users and sample records for faster demonstrations
- Email integration for selected booking-related actions

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, React Router, React Scripts, Testing Library |
| Backend | Spring Boot 3.4.2, Spring Web, Spring Security, Spring Validation |
| Database | MongoDB |
| Authentication | JWT + Google OAuth token verification |
| Media Upload | Cloudinary |
| Notifications / Mail | Spring Mail |
| QR Utilities | ZXing |
| Build Tools | Maven, npm |
| CI | GitHub Actions |

## System Architecture

```text
React Client (User Portal + Admin Portal)
        |
        | HTTP / JSON + JWT
        v
Spring Boot REST API
        |
        | Repository Layer
        v
MongoDB

External integrations:
- Google OAuth verification
- Cloudinary image hosting
- SMTP mail service
```

## Repository Structure

```text
.
|-- backend
|   |-- pom.xml
|   `-- src
|       |-- main
|       |   |-- java/com/sliit/smartcampus
|       |   |   |-- booking
|       |   |   |-- config
|       |   |   |-- event
|       |   |   |-- exception
|       |   |   |-- facility
|       |   |   |-- health
|       |   |   |-- home
|       |   |   |-- incident
|       |   |   |-- notification
|       |   |   |-- resource
|       |   |   |-- security
|       |   |   |-- service
|       |   |   `-- user
|       |   `-- resources/application.yml
|       `-- test
|-- frontend
|   |-- package.json
|   `-- src
|       |-- admin
|       |-- components
|       |-- user
|       `-- utils
`-- .github/workflows/ci.yml
```

## Main Frontend Areas

### User portal

- Landing page
- Login and signup
- Home dashboard
- Facilities browser
- My bookings
- Incidents
- Notifications
- Profile
- Technician dashboard
- Events

### Admin portal

- Admin dashboard
- Facilities management
- Booking management
- Incident management
- User management
- Event management
- Event QR check-in
- Notifications

## Main API Areas

| Area | Base Path |
| --- | --- |
| User auth and profile | `/api/user` |
| Google auth | `/api/auth` |
| Facilities | `/api/facilities` |
| Admin facilities | `/api/admin/facilities` |
| Bookings | `/api/bookings` |
| Admin bookings | `/api/admin/bookings` |
| Waitlist | `/api/waitlist` |
| Incidents | `/api/incidents` |
| Admin incidents | `/api/admin/incidents` |
| Notifications | `/api/notifications` |
| Users admin | `/api/admin/users` |
| Events | `/api/events` |
| Admin events | `/api/admin/events` |
| Resources | `/api/resources` |
| Services | `/api/services` |
| Analytics | `/api/admin/analytics` |
| Home summary | `/api/home` |

## Local Setup

### Prerequisites

- Java 21
- Maven 3.9+
- Node.js 18+
- npm 9+
- MongoDB connection or MongoDB Atlas access

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd IT3030-PAF-2026-smart-campus-NUSLIIT_JFN3
```

### 2. Backend setup

The backend is configured through [`backend/src/main/resources/application.yml`](./backend/src/main/resources/application.yml).

Important services currently referenced by the project:

- MongoDB
- Google OAuth client ID
- Cloudinary
- SMTP mail server
- JWT secret

Run the backend:

```bash
cd backend
mvn spring-boot:run
```

Backend default URL:

```text
http://localhost:8080
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm start
```

Frontend default URL:

```text
http://localhost:3000
```

## Seeded Demo Accounts

The backend data initializer creates demo users if they do not already exist.

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Technician | `techsupport` | `tech123` |
| User | `demouser` | `user123` |

## Demo Data Seeded at Startup

The application seeds sample data for easier demonstrations:

- Users
- Facilities
- Events
- Learning resources
- Campus services
- Example incident tickets

## Security Notes

- JWT is used for stateless API authentication
- Protected endpoints require a bearer token
- Role restrictions are applied in the backend and frontend
- File uploads are supported for incident evidence
- Google sign-in is integrated through backend token verification

## Testing Status

Current repository testing artifacts include:

- Backend Spring Boot test scaffold
- Backend `BookingServiceTest`
- Frontend default React Testing Library test

Important note:

- The existing backend test configuration is not fully aligned with the current MongoDB-based application design, so CI currently focuses on reliable build validation rather than forcing unstable test execution.

## GitHub Actions Workflow

This repository includes a GitHub Actions workflow at [`./.github/workflows/ci.yml`](./.github/workflows/ci.yml).

The workflow:

- Runs on every push
- Runs on every pull request
- Can be triggered manually with `workflow_dispatch`
- Builds the backend with Maven
- Builds the frontend with npm

## Suggested Individual Contribution Mapping

Replace this section with your actual group member names or IDs before final submission.

| Member | Suggested area |
| --- | --- |
| Member 1 | Facilities and resource catalogue |
| Member 2 | Booking workflow and conflict handling |
| Member 3 | Incidents, attachments, and technician flow |
| Member 4 | Notifications, auth, security, and OAuth improvements |





## Run Commands Summary

```bash
# backend
cd backend
mvn spring-boot:run

# frontend
cd frontend
npm install
npm start
```
