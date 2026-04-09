package com.sliit.smartcampus.event;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class CampusEventController {
    private final CampusEventRepository eventRepository;
    private final EventBookingRepository bookingRepository;

    public CampusEventController(CampusEventRepository eventRepository, EventBookingRepository bookingRepository) {
        this.eventRepository = eventRepository;
        this.bookingRepository = bookingRepository;
    }

    @GetMapping
    public List<CampusEvent> getEvents() {
        return eventRepository.findAll();
    }

    @GetMapping("/{eventId}/availability")
    public java.util.Map<String, Object> getAvailability(@PathVariable String eventId) {
        CampusEvent ev = eventRepository.findById(eventId).orElse(null);
        if (ev == null) return java.util.Map.of("error", "Event not found");
        int capacity = ev.getCapacity() == null ? -1 : ev.getCapacity();
        // Count both CONFIRMED and CHECKED_IN as they occupy seats
        java.util.List<EventBooking> confirmed = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.CONFIRMED);
        java.util.List<EventBooking> checkedIn = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.CHECKED_IN);
        java.util.List<EventBooking> waitlist = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.WAITLISTED);
        int confirmedCount = confirmed.size() + checkedIn.size();
        int waitlistCount = waitlist.size();
        int remaining = capacity < 0 ? -1 : Math.max(0, capacity - confirmedCount);
        return java.util.Map.of(
                "capacity", capacity,
                "confirmedCount", confirmedCount,
                "waitlistCount", waitlistCount,
                "remaining", remaining
        );
    }
}
