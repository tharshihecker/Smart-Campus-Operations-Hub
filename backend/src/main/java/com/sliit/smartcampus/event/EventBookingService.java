package com.sliit.smartcampus.event;

import com.sliit.smartcampus.notification.NotificationService;
import com.sliit.smartcampus.notification.NotificationType;
import com.sliit.smartcampus.user.User;
import com.sliit.smartcampus.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Service
@Transactional
public class EventBookingService {
    private final EventBookingRepository bookingRepository;
    private final CampusEventRepository eventRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public EventBookingService(EventBookingRepository bookingRepository,
                               CampusEventRepository eventRepository,
                               UserRepository userRepository,
                               NotificationService notificationService) {
        this.bookingRepository = bookingRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public EventBooking createBooking(String eventId, String userId,
                                      String studentNumber, String nic,
                                      String guestName, String guestEmail) {
        CampusEvent ev = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Event not found"));

        // Validate booking close date
        if (ev.getBookingCloseDate() != null && !ev.getBookingCloseDate().isBlank()) {
            try {
                LocalDate close = LocalDate.parse(ev.getBookingCloseDate());
                if (LocalDate.now().isAfter(close)) {
                    throw new ResponseStatusException(BAD_REQUEST, "Booking closed for this event");
                }
            } catch (DateTimeParseException ex) {
                throw new ResponseStatusException(BAD_REQUEST, "Invalid booking close date on event");
            }
        }

        EventBooking b = new EventBooking();
        b.setEventId(eventId);

        if (userId != null && !userId.isBlank()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
            // Prevent duplicate booking by same user
            if (bookingRepository.existsByEventIdAndUser_Id(eventId, userId)) {
                throw new ResponseStatusException(BAD_REQUEST, "You have already booked this event");
            }
            b.setUser(user);
        } else {
            // Guest booking — attach provided guest details
            b.setGuestName(guestName);
            b.setStudentNumber(studentNumber);
            b.setNic(nic);
            b.setGuestEmail(guestEmail);
        }

        b.setBookingNumber(generateBookingNumber());

        // Determine capacity and assign seat or waitlist
        if (ev.getCapacity() != null && ev.getCapacity() > 0) {
            List<EventBooking> confirmed = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.CONFIRMED);
            int used = confirmed.size();
            if (used < ev.getCapacity()) {
                // assign lowest available seat number 1..capacity
                Set<Integer> usedSeats = confirmed.stream()
                        .map(EventBooking::getSeatNumber)
                        .filter(s -> s != null)
                        .collect(Collectors.toSet());
                Integer assigned = null;
                for (int i = 1; i <= ev.getCapacity(); i++) {
                    if (!usedSeats.contains(i)) { assigned = i; break; }
                }
                b.setSeatNumber(assigned);
                b.setStatus(EventBooking.BookingStatus.CONFIRMED);
            } else {
                // add to waitlist
                b.setStatus(EventBooking.BookingStatus.WAITLISTED);
            }
        } else {
            // No capacity limit — always confirm without seat number
            b.setStatus(EventBooking.BookingStatus.CONFIRMED);
        }

        bookingRepository.save(b);

        // Create notification for registered user
        String title;
        String msg;
        if (b.getStatus() == EventBooking.BookingStatus.CONFIRMED) {
            title = "Event booking confirmed";
            msg = String.format("Your booking for '%s' is confirmed. Booking ID: %s. Seat: %s",
                    ev.getTitle(), b.getBookingNumber(), b.getSeatNumber() == null ? "N/A" : b.getSeatNumber());
            if (b.getUser() != null) {
                notificationService.createNotification(b.getUser(), title, msg, NotificationType.BOOKING_APPROVED, b.getId(), "event_booking");
                System.out.printf("[MAIL] To=%s Subject=%s Message=%s\n", b.getUser().getEmail(), title, msg);
            } else if (guestEmail != null && !guestEmail.isBlank()) {
                System.out.printf("[MAIL] To=%s Subject=%s Message=%s\n", guestEmail, title, msg);
            }
        } else {
            title = "Event booking waitlisted";
            msg = String.format("Your booking for '%s' is waitlisted. Booking ID: %s", ev.getTitle(), b.getBookingNumber());
            if (b.getUser() != null) {
                notificationService.createNotification(b.getUser(), title, msg, NotificationType.BOOKING_APPROVED, b.getId(), "event_booking");
                System.out.printf("[MAIL] To=%s Subject=%s Message=%s\n", b.getUser().getEmail(), title, msg);
            } else if (guestEmail != null && !guestEmail.isBlank()) {
                System.out.printf("[MAIL] To=%s Subject=%s Message=%s\n", guestEmail, title, msg);
            }
        }

        return b;
    }

    public java.util.List<EventBooking> getUserBookings(String userId) {
        return bookingRepository.findByUser_Id(userId);
    }

    public EventBooking cancelBooking(String bookingId, String userId) {
        EventBooking b = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Booking not found"));

        if (b.getUser() == null || !b.getUser().getId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "You can only cancel your own bookings");
        }

        // store status and event id before deletion
        EventBooking.BookingStatus prevStatus = b.getStatus();
        String eventId = b.getEventId();
        bookingRepository.delete(b);

        // Notify user about cancellation
        String title = "Event booking cancelled";
        String msg = String.format("Your booking for '%s' has been cancelled. Booking ID: %s",
                eventRepository.findById(b.getEventId()).map(CampusEvent::getTitle).orElse("(event)"), b.getBookingNumber());
        notificationService.createNotification(b.getUser(), title, msg, NotificationType.BOOKING_CANCELLED, b.getId(), "event_booking");

        // If this freed a confirmed seat, promote the earliest waitlisted booking (if any)
        if (prevStatus == EventBooking.BookingStatus.CONFIRMED) {
            List<EventBooking> waitlist = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.WAITLISTED);
            if (!waitlist.isEmpty()) {
                EventBooking promote = waitlist.get(0);
                // compute lowest available seat
                CampusEvent ev = eventRepository.findById(eventId).orElse(null);
                if (ev != null && ev.getCapacity() != null && ev.getCapacity() > 0) {
                    List<EventBooking> confirmed = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.CONFIRMED);
                    Set<Integer> usedSeats = confirmed.stream()
                            .map(EventBooking::getSeatNumber)
                            .filter(s -> s != null)
                            .collect(Collectors.toSet());
                    Integer assigned = null;
                    for (int i = 1; i <= ev.getCapacity(); i++) {
                        if (!usedSeats.contains(i)) { assigned = i; break; }
                    }
                    promote.setSeatNumber(assigned);
                }
                promote.setStatus(EventBooking.BookingStatus.CONFIRMED);
                bookingRepository.save(promote);

                // Notify promoted user
                String pTitle = "Event booking confirmed from waitlist";
                String pMsg = String.format("Your booking for '%s' is now confirmed. Booking ID: %s. Seat: %s",
                        eventRepository.findById(eventId).map(CampusEvent::getTitle).orElse("(event)"), promote.getBookingNumber(), promote.getSeatNumber() == null ? "N/A" : promote.getSeatNumber());
                if (promote.getUser() != null) {
                    notificationService.createNotification(promote.getUser(), pTitle, pMsg, NotificationType.BOOKING_APPROVED, promote.getId(), "event_booking");
                    System.out.printf("[MAIL] To=%s Subject=%s Message=%s\n", promote.getUser().getEmail(), pTitle, pMsg);
                } else if (promote.getGuestEmail() != null && !promote.getGuestEmail().isBlank()) {
                    System.out.printf("[MAIL] To=%s Subject=%s Message=%s\n", promote.getGuestEmail(), pTitle, pMsg);
                }
            }
        }

        return b;
    }

    private String generateBookingNumber() {
        return "EV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
