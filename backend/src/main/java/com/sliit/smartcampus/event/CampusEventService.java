package com.sliit.smartcampus.event;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@Service
public class CampusEventService {
    private final CampusEventRepository eventRepository;
    private final EventBookingRepository bookingRepository;

    public CampusEventService(CampusEventRepository eventRepository, EventBookingRepository bookingRepository) {
        this.eventRepository = eventRepository;
        this.bookingRepository = bookingRepository;
    }

    public List<CampusEvent> getAllEvents() {
        return eventRepository.findAll();
    }

    public CampusEvent getEventById(String id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    public CampusEvent createEvent(CampusEvent event) {
        validateEventDatesAndCapacity(event);
        return eventRepository.save(event);
    }

    public CampusEvent updateEvent(String id, CampusEvent event) {
        CampusEvent existing = getEventById(id);
        existing.setTitle(event.getTitle());
        existing.setDescription(event.getDescription());
        existing.setEventDate(event.getEventDate());
        existing.setBookingCloseDate(event.getBookingCloseDate());
        existing.setStartTime(event.getStartTime());
        existing.setEndTime(event.getEndTime());
        existing.setCapacity(event.getCapacity());
        existing.setImageUrl(event.getImageUrl());
        existing.setLocation(event.getLocation());
        validateEventDatesAndCapacity(existing);
        return eventRepository.save(existing);
    }

    public void deleteEvent(String id) {
        if (!eventRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }
        eventRepository.deleteById(id);
    }

    public Map<String, Object> getAvailability(String eventId) {
        CampusEvent ev = getEventById(eventId);
        int capacity = ev.getCapacity() == null ? -1 : ev.getCapacity();
        
        List<EventBooking> confirmed = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.CONFIRMED);
        List<EventBooking> checkedIn = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.CHECKED_IN);
        List<EventBooking> waitlist = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.WAITLISTED);
        
        int confirmedCount = confirmed.size() + checkedIn.size();
        int waitlistCount = waitlist.size();
        int remaining = capacity < 0 ? -1 : Math.max(0, capacity - confirmedCount);
        
        return Map.of(
                "capacity", capacity,
                "confirmedCount", confirmedCount,
                "waitlistCount", waitlistCount,
                "remaining", remaining
        );
    }

    private void validateEventDatesAndCapacity(CampusEvent event) {
        if (event.getEventDate() != null && event.getBookingCloseDate() != null
                && !event.getBookingCloseDate().isBlank() && !event.getEventDate().isBlank()) {
            try {
                LocalDate evDate = LocalDate.parse(event.getEventDate());
                LocalDate closeDate = LocalDate.parse(event.getBookingCloseDate());
                if (!closeDate.isBefore(evDate)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking close date must be before event start date");
                }
            } catch (DateTimeParseException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format (expected YYYY-MM-DD)");
            }
        }
        if (event.getCapacity() != null && event.getCapacity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Capacity cannot be negative");
        }
    }
}
