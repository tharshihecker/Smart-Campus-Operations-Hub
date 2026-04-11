package com.sliit.smartcampus.service;

import com.sliit.smartcampus.model.Booking;
import com.sliit.smartcampus.model.BookingStatus;
import com.sliit.smartcampus.model.CampusEvent;
import com.sliit.smartcampus.model.EventBooking;
import com.sliit.smartcampus.model.Notification;
import com.sliit.smartcampus.model.NotificationType;
import com.sliit.smartcampus.model.User;
import com.sliit.smartcampus.model.Waitlist;
import com.sliit.smartcampus.repository.BookingRepository;
import com.sliit.smartcampus.repository.CampusEventRepository;
import com.sliit.smartcampus.repository.EventBookingRepository;
import com.sliit.smartcampus.repository.UserRepository;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
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
        b.setStudentNumber(studentNumber);
        b.setNic(nic);

        if (userId != null && !userId.isBlank()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
            // Prevent duplicate booking by same user (exclude cancelled bookings)
            if (bookingRepository.existsByEventIdAndUser_IdAndStatusNot(eventId, userId, EventBooking.BookingStatus.CANCELLED)) {
                throw new ResponseStatusException(BAD_REQUEST, "You have already booked this event");
            }
            b.setUser(user);
        } else {
            // Guest booking — attach provided guest details
            b.setGuestName(guestName);
            b.setGuestEmail(guestEmail);
        }

        b.setBookingNumber(generateBookingNumber());

        // Determine capacity and assign seat or waitlist
        if (ev.getCapacity() != null && ev.getCapacity() > 0) {
            // Count both CONFIRMED and CHECKED_IN bookings as they occupy seats
            List<EventBooking> confirmed = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.CONFIRMED);
            List<EventBooking> checkedIn = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.CHECKED_IN);
            int used = confirmed.size() + checkedIn.size();
            if (used < ev.getCapacity()) {
                // assign lowest available seat number 1..capacity
                Set<Integer> usedSeats = new java.util.HashSet<>();
                confirmed.forEach(bk -> { if (bk.getSeatNumber() != null) usedSeats.add(bk.getSeatNumber()); });
                checkedIn.forEach(bk -> { if (bk.getSeatNumber() != null) usedSeats.add(bk.getSeatNumber()); });
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
            // generate QR token ONLY for confirmed bookings
            String token = UUID.randomUUID().toString();
            b.setQrToken(token);
            bookingRepository.save(b);
            title = "Event booking confirmed";
            msg = String.format("Your booking for '%s' is confirmed. Booking ID: %s. Seat: %s.",
                    ev.getTitle(), b.getBookingNumber(), b.getSeatNumber() == null ? "N/A" : b.getSeatNumber());
            if (b.getUser() != null) {
                notificationService.createNotification(b.getUser(), title, msg, NotificationType.BOOKING_APPROVED, b.getId(), "event_booking");
                System.out.printf("[MAIL] To=%s Subject=%s Message=%s\n", b.getUser().getEmail(), title, msg);
            } else if (guestEmail != null && !guestEmail.isBlank()) {
                System.out.printf("[MAIL] To=%s Subject=%s Message=%s\n", guestEmail, title, msg);
            }
        } else {
            // Waitlisted - NO QR token generated
            title = "Event booking waitlisted";
            msg = String.format("Your booking for '%s' is waitlisted. Booking ID: %s. You will receive a QR code once confirmed.", ev.getTitle(), b.getBookingNumber());
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
        // Return only non-cancelled bookings
        return bookingRepository.findByUser_IdAndStatusNot(userId, EventBooking.BookingStatus.CANCELLED);
    }

    public EventBooking cancelBooking(String bookingId, String userId) {
        EventBooking b = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Booking not found"));

        if (b.getUser() == null || !b.getUser().getId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "You can only cancel your own bookings");
        }

        // Block cancellation if already checked in
        if (b.getStatus() == EventBooking.BookingStatus.CHECKED_IN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Cannot cancel a booking that has already been checked in");
        }

        // store status and event id before update
        EventBooking.BookingStatus prevStatus = b.getStatus();
        String eventId = b.getEventId();
        
        // Mark as cancelled instead of deleting
        b.setStatus(EventBooking.BookingStatus.CANCELLED);
        bookingRepository.save(b);

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
                    // Get all active bookings (CONFIRMED and CHECKED_IN)
                    List<EventBooking> confirmed = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.CONFIRMED);
                    List<EventBooking> checkedIn = bookingRepository.findByEventIdAndStatusOrderByCreatedAtAsc(eventId, EventBooking.BookingStatus.CHECKED_IN);
                    Set<Integer> usedSeats = new java.util.HashSet<>();
                    confirmed.forEach(bk -> { if (bk.getSeatNumber() != null) usedSeats.add(bk.getSeatNumber()); });
                    checkedIn.forEach(bk -> { if (bk.getSeatNumber() != null) usedSeats.add(bk.getSeatNumber()); });
                    Integer assigned = null;
                    for (int i = 1; i <= ev.getCapacity(); i++) {
                        if (!usedSeats.contains(i)) { assigned = i; break; }
                    }
                    promote.setSeatNumber(assigned);
                }
                promote.setStatus(EventBooking.BookingStatus.CONFIRMED);
                // generate QR for promoted booking
                promote.setQrToken(UUID.randomUUID().toString());
                bookingRepository.save(promote);

                // Notify promoted user
                String pTitle = "Event booking confirmed from waitlist";
                String pMsg = String.format("Your booking for '%s' is now confirmed. Booking ID: %s. Seat: %s.",
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

    public EventBooking confirmBookingByQr(String qrToken, String adminId) {
        if (qrToken == null || qrToken.isBlank()) throw new ResponseStatusException(BAD_REQUEST, "QR token required");
        EventBooking b = bookingRepository.findByQrToken(qrToken);
        if (b == null) throw new ResponseStatusException(NOT_FOUND, "Booking not found for provided QR");
        
        // Check if booking is cancelled
        if (b.getStatus() == EventBooking.BookingStatus.CANCELLED) {
            throw new ResponseStatusException(BAD_REQUEST, "This booking has been cancelled and cannot be checked in");
        }
        
        // Check if already checked in
        if (b.getStatus() == EventBooking.BookingStatus.CHECKED_IN) {
            throw new ResponseStatusException(BAD_REQUEST, "This QR has already been used for check-in");
        }
        
        // Check if booking is confirmed
        if (b.getStatus() != EventBooking.BookingStatus.CONFIRMED) {
            throw new ResponseStatusException(BAD_REQUEST, "Booking is not confirmed");
        }

        b.setStatus(EventBooking.BookingStatus.CHECKED_IN);
        b.setCheckedInAt(java.time.LocalDateTime.now());
        bookingRepository.save(b);

        // Notify user that check-in completed
        String title = "Event check-in confirmed";
        String msg = String.format("Your booking for '%s' has been checked in. Booking ID: %s.",
                eventRepository.findById(b.getEventId()).map(CampusEvent::getTitle).orElse("(event)"), b.getBookingNumber());
        if (b.getUser() != null) {
            notificationService.createNotification(b.getUser(), title, msg, NotificationType.BOOKING_APPROVED, b.getId(), "event_booking");
        } else if (b.getGuestEmail() != null && !b.getGuestEmail().isBlank()) {
            System.out.printf("[MAIL] To=%s Subject=%s Message=%s\n", b.getGuestEmail(), title, msg);
        }

        return b;
    }

    public byte[] generateQrCodeImage(String text) throws WriterException, IOException {
        String qrData = "http://localhost:3000/admin/event-checkin?qr=" + text;
        QRCodeWriter qrWriter = new QRCodeWriter();
        BitMatrix matrix = qrWriter.encode(qrData, BarcodeFormat.QR_CODE, 400, 400);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            return baos.toByteArray();
        }
    }

    public Map<String, Object> getBookingSummaryByToken(String token) {
        EventBooking b = bookingRepository.findByQrToken(token);
        if (b == null) throw new ResponseStatusException(NOT_FOUND, "Booking not found");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("bookingId", b.getId());
        result.put("bookingNumber", b.getBookingNumber());
        result.put("status", b.getStatus().name());
        result.put("seatNumber", b.getSeatNumber());
        result.put("checkedInAt", b.getCheckedInAt() != null ? b.getCheckedInAt().toString() : null);
        result.put("createdAt", b.getCreatedAt() != null ? b.getCreatedAt().toString() : null);

        if (b.getUser() != null) {
            result.put("attendeeName", b.getUser().getFullName());
            result.put("attendeeEmail", b.getUser().getEmail());
        } else {
            result.put("attendeeName", b.getGuestName());
            result.put("attendeeEmail", b.getGuestEmail());
        }
        result.put("studentNumber", b.getStudentNumber());
        result.put("nic", b.getNic());

        eventRepository.findById(b.getEventId()).ifPresent(ev -> {
            result.put("eventTitle", ev.getTitle());
            result.put("eventDate", ev.getEventDate());
            result.put("eventLocation", ev.getLocation());
            result.put("eventStartTime", ev.getStartTime());
            result.put("eventEndTime", ev.getEndTime());
        });

        return result;
    }
}



