package com.sliit.smartcampus.config;

import com.sliit.smartcampus.event.CampusEvent;
import com.sliit.smartcampus.event.CampusEventRepository;
import com.sliit.smartcampus.facility.Facility;
import com.sliit.smartcampus.facility.FacilityRepository;
import com.sliit.smartcampus.facility.ResourceStatus;
import com.sliit.smartcampus.facility.ResourceType;
import com.sliit.smartcampus.incident.IncidentTicket;
import com.sliit.smartcampus.incident.IncidentTicketRepository;
import com.sliit.smartcampus.incident.TicketPriority;
import com.sliit.smartcampus.incident.TicketStatus;
import com.sliit.smartcampus.resource.LearningResource;
import com.sliit.smartcampus.resource.LearningResourceRepository;
import com.sliit.smartcampus.service.CampusServiceItem;
import com.sliit.smartcampus.service.CampusServiceRepository;
import com.sliit.smartcampus.user.User;
import com.sliit.smartcampus.user.UserRepository;
import com.sliit.smartcampus.user.UserRole;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalTime;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(
            CampusEventRepository eventRepository,
            LearningResourceRepository resourceRepository,
            CampusServiceRepository serviceRepository,
            FacilityRepository facilityRepository,
            UserRepository userRepository,
            IncidentTicketRepository incidentTicketRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            // Seed admin user
            if (userRepository.findByUsernameIgnoreCase("admin").isEmpty()) {
                userRepository.save(buildUser("admin", "admin@smartcampus.lk", "admin123",
                        "System Administrator", "IT Services", UserRole.ADMIN, passwordEncoder));
            }

            // Seed technician user
            if (userRepository.findByUsernameIgnoreCase("techsupport").isEmpty()) {
                userRepository.save(buildUser("techsupport", "tech@smartcampus.lk", "tech123",
                        "Alex Technician", "Facilities & Maintenance", UserRole.TECHNICIAN, passwordEncoder));
            }

            // Seed demo user
            if (userRepository.findByUsernameIgnoreCase("demouser").isEmpty()) {
                userRepository.save(buildUser("demouser", "user@smartcampus.lk", "user123",
                        "Demo Student", "Faculty of Computing", UserRole.USER, passwordEncoder));
            }

            if (eventRepository.count() == 0) {
                eventRepository.saveAll(List.of(
                        new CampusEvent("Innovation Meetup", "Startup ideation and prototype discussion with faculty mentors.", "2026-03-10", "Engineering Auditorium"),
                        new CampusEvent("Career Accelerator", "Industry panel and CV clinic for internship and graduate roles.", "2026-03-14", "Main Hall"),
                        new CampusEvent("Wellness Week", "Guided activities on mental health, nutrition, and fitness.", "2026-03-20", "Student Center"),
                        new CampusEvent("Tech Talk: AI in Education", "Guest lecture on AI applications in modern education.", "2026-03-25", "Lecture Hall B"),
                        new CampusEvent("Hackathon 2026", "24-hour coding challenge with industry sponsors and prizes.", "2026-04-05", "Computing Center"),
                        new CampusEvent("Cultural Festival", "Celebrating diversity through performances, food, and art.", "2026-04-12", "Open Grounds")
                ));
            }

            if (resourceRepository.count() == 0) {
                resourceRepository.saveAll(List.of(
                        new LearningResource("Digital Library Access", "Central search for journals, books, and citation databases.", "Library"),
                        new LearningResource("Study Space Finder", "Live availability for quiet rooms and team collaboration areas.", "Infrastructure"),
                        new LearningResource("Cloud Lab Environment", "Provisioned coding environments for software modules.", "Technology"),
                        new LearningResource("Research Paper Hub", "Access to IEEE, ACM, and Springer research papers.", "Library"),
                        new LearningResource("Video Tutorial Archive", "Curated tutorials on programming, design, and data science.", "Technology"),
                        new LearningResource("Exam Prep Materials", "Past papers, solution guides, and practice quizzes.", "Academic")
                ));
            }

            if (serviceRepository.count() == 0) {
                serviceRepository.saveAll(List.of(
                        new CampusServiceItem("Health Desk Support", "Appointment management and preventive care guidance.", "active"),
                        new CampusServiceItem("Academic Advising", "Scheduling and tracking for academic consultations.", "active"),
                        new CampusServiceItem("Administrative Helpdesk", "Assistance for registration, letters, and payments.", "maintenance"),
                        new CampusServiceItem("IT Support Center", "Technical support for campus Wi-Fi, email, and device issues.", "active"),
                        new CampusServiceItem("Career Guidance Office", "Resume reviews, mock interviews, and job placement support.", "active"),
                        new CampusServiceItem("Transport Shuttle", "Campus shuttle tracking and schedule information.", "active")
                ));
            }

            if (facilityRepository.count() == 0) {
                facilityRepository.saveAll(List.of(
                        createFacility("Engineering Lecture Hall A", ResourceType.LECTURE_HALL, 220, "Engineering Block A - Level 1", LocalTime.of(8, 0), LocalTime.of(18, 0), ResourceStatus.ACTIVE, "Tiered lecture hall with integrated audio system and smart board."),
                        createFacility("AI Research Lab 3", ResourceType.LAB, 40, "Computing Center - Level 4", LocalTime.of(9, 0), LocalTime.of(20, 0), ResourceStatus.ACTIVE, "GPU-enabled lab for machine learning and robotics coursework."),
                        createFacility("Senate Meeting Room 2", ResourceType.MEETING_ROOM, 24, "Admin Building - Level 2", LocalTime.of(8, 30), LocalTime.of(17, 30), ResourceStatus.ACTIVE, "Executive meeting room with conferencing display and telepresence."),
                        createFacility("Portable Projector Unit PX-14", ResourceType.PROJECTOR, 1, "Media Store - Equipment Bay", LocalTime.of(8, 0), LocalTime.of(16, 30), ResourceStatus.MAINTENANCE, "4K portable projector with HDMI/USB-C input and carrying kit."),
                        createFacility("DSLR Camera Kit C-09", ResourceType.CAMERA, 1, "Digital Studio - Equipment Desk", LocalTime.of(9, 0), LocalTime.of(17, 0), ResourceStatus.OUT_OF_SERVICE, "Photography and media production camera kit with tripod and mic."),
                        createFacility("Science Lecture Hall B", ResourceType.LECTURE_HALL, 180, "Science Block B - Ground Floor", LocalTime.of(8, 0), LocalTime.of(19, 0), ResourceStatus.ACTIVE, "Spacious hall with dual projection, surround sound, and recording."),
                        createFacility("Networking Lab 1", ResourceType.LAB, 30, "IT Block C - Level 2", LocalTime.of(8, 0), LocalTime.of(18, 0), ResourceStatus.ACTIVE, "Cisco rack-based lab for networking and cybersecurity practicals."),
                        createFacility("Board Room Alpha", ResourceType.MEETING_ROOM, 12, "Admin Tower - Level 5", LocalTime.of(9, 0), LocalTime.of(16, 0), ResourceStatus.ACTIVE, "Premium boardroom with video wall and whiteboard collaboration."),
                        createFacility("4K Cinema Projector CX-20", ResourceType.PROJECTOR, 1, "AV Department - Room 12", LocalTime.of(10, 0), LocalTime.of(16, 0), ResourceStatus.ACTIVE, "High-lumen cinema projector for auditorium and event use."),
                        createFacility("360-Degree Camera RIG", ResourceType.CAMERA, 1, "Media Lab - Studio 3", LocalTime.of(9, 0), LocalTime.of(17, 0), ResourceStatus.ACTIVE, "Professional 360-degree camera rig for VR and immersive content.")
                ));
            }

            // Seed sample incident tickets
            if (incidentTicketRepository.count() == 0) {
                User reporter = userRepository.findByUsernameIgnoreCase("demouser").orElse(null);
                User tech = userRepository.findByUsernameIgnoreCase("techsupport").orElse(null);
                if (reporter != null && tech != null) {
                    incidentTicketRepository.saveAll(List.of(
                            buildTicket(reporter, null, "Projector Not Working in Hall A", "The projector in Engineering Lecture Hall A is displaying a 'No Signal' error. Cannot connect laptop via HDMI.", "AV Equipment", TicketPriority.HIGH, "Engineering Block A - Level 1", TicketStatus.OPEN),
                            buildTicket(reporter, tech, "Water Leak in Computing Lab", "There is a water leak from the ceiling near workstation #12. Risk of equipment damage.", "Infrastructure", TicketPriority.CRITICAL, "Computing Center - Level 2", TicketStatus.IN_PROGRESS),
                            buildTicket(reporter, tech, "Broken Air Conditioning", "AC unit in Board Room Alpha making loud noise and not cooling. Meeting scheduled for tomorrow.", "HVAC", TicketPriority.MEDIUM, "Admin Tower - Level 5", TicketStatus.RESOLVED)
                    ));
                }
            }
        };
    }

    private User buildUser(String username, String email, String password, String fullName,
                           String department, UserRole role, PasswordEncoder encoder) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setPassword(encoder.encode(password));
        u.setFullName(fullName);
        u.setDepartment(department);
        u.setRole(role);
        u.setEnabled(true);
        return u;
    }

    private Facility createFacility(String name, ResourceType type, int capacity, String location,
                                    LocalTime from, LocalTime to, ResourceStatus status, String description) {
        Facility f = new Facility();
        f.setName(name);
        f.setType(type);
        f.setCapacity(capacity);
        f.setLocation(location);
        f.setAvailableFrom(from);
        f.setAvailableTo(to);
        f.setStatus(status);
        f.setDescription(description);
        return f;
    }

    private IncidentTicket buildTicket(User reporter, User assignee, String title, String description,
                                       String category, TicketPriority priority, String location, TicketStatus status) {
        IncidentTicket t = new IncidentTicket();
        t.setReporter(reporter);
        t.setAssignee(assignee);
        t.setTitle(title);
        t.setDescription(description);
        t.setCategory(category);
        t.setPriority(priority);
        t.setLocation(location);
        t.setStatus(status);
        t.setContactDetails(reporter.getEmail());
        return t;
    }
}
