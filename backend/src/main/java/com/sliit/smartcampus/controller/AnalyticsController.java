package com.sliit.smartcampus.controller;

import com.sliit.smartcampus.model.Booking;
import com.sliit.smartcampus.model.BookingStatus;
import com.sliit.smartcampus.model.Facility;
import com.sliit.smartcampus.model.IncidentTicket;
import com.sliit.smartcampus.model.TicketStatus;
import com.sliit.smartcampus.repository.BookingRepository;
import com.sliit.smartcampus.repository.FacilityRepository;
import com.sliit.smartcampus.repository.IncidentTicketRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
/**
 * Admin Analytics REST Controller.
 * Endpoint: GET /api/admin/analytics
 *
 * Provides aggregated metrics for:
 * - Booking status breakdown
 * - Top 5 most-booked facilities
 * - Peak booking hours histogram
 * - Incident ticket stats by priority and status
 * - Average ticket resolution time (SLA metric)
 */
@RestController
@RequestMapping("/api/admin/analytics")
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsController {

    private final BookingRepository bookingRepository;
    private final FacilityRepository facilityRepository;
    private final IncidentTicketRepository incidentTicketRepository;

    public AnalyticsController(BookingRepository bookingRepository,
                                FacilityRepository facilityRepository,
                                IncidentTicketRepository incidentTicketRepository) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
        this.incidentTicketRepository = incidentTicketRepository;
    }

    @GetMapping
    public Map<String, Object> getAnalytics() {
        // ── Booking stats by status ──
        Map<String, Long> bookingsByStatus = Arrays.stream(BookingStatus.values())
                .collect(Collectors.toMap(
                        Enum::name,
                        s -> bookingRepository.countByStatus(s)
                ));

        // ── Top 5 facilities by booking count ──
        List<Booking> allBookings = bookingRepository.findAllByOrderByCreatedAtDesc();
        Map<String, Long> facilityBookingCount = allBookings.stream()
                .collect(Collectors.groupingBy(b -> b.getFacility().getId(), Collectors.counting()));

        List<Map<String, Object>> topFacilities = facilityBookingCount.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Optional<Facility> fOpt = facilityRepository.findById(e.getKey());
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("facilityId", e.getKey());
                    m.put("facilityName", fOpt.map(Facility::getName).orElse("Unknown"));
                    m.put("bookingCount", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());

        // ── Peak booking hours (0-23) ──
        Map<Integer, Long> peakHours = allBookings.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getStartTime().getHour(),
                        Collectors.counting()
                ));

        // ── Incident tickets by priority ──
        List<IncidentTicket> allTickets = incidentTicketRepository.findAll();
        Map<String, Long> ticketsByPriority = allTickets.stream()
                .collect(Collectors.groupingBy(t -> t.getPriority().name(), Collectors.counting()));

        // ── Incident tickets by status ──
        Map<String, Long> ticketsByStatus = allTickets.stream()
                .collect(Collectors.groupingBy(t -> t.getStatus().name(), Collectors.counting()));

        // ── Average resolution time (hours) for RESOLVED tickets ──
        OptionalDouble avgResolutionHours = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.RESOLVED && t.getResolvedAt() != null && t.getCreatedAt() != null)
                .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getResolvedAt()).toHours())
                .average();

        // ── Today's bookings ──
        long todayBookings = allBookings.stream()
                .filter(b -> b.getBookingDate() != null && b.getBookingDate().equals(LocalDate.now()))
                .count();

        // ── Open incidents (OPEN + IN_PROGRESS) ──
        long openIncidents = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.OPEN || t.getStatus() == TicketStatus.IN_PROGRESS)
                .count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("bookingsByStatus", bookingsByStatus);
        result.put("topFacilities", topFacilities);
        result.put("peakHours", peakHours);
        result.put("ticketsByPriority", ticketsByPriority);
        result.put("ticketsByStatus", ticketsByStatus);
        result.put("avgResolutionHours", avgResolutionHours.isPresent() ? Math.round(avgResolutionHours.getAsDouble()) : 0);
        result.put("todayBookings", todayBookings);
        result.put("openIncidents", openIncidents);
        result.put("totalBookings", allBookings.size());
        result.put("totalTickets", allTickets.size());
        return result;
    }
}



