package com.sliit.smartcampus.notification;

import com.sliit.smartcampus.event.CampusEvent;
import com.sliit.smartcampus.event.CampusEventRepository;
import com.sliit.smartcampus.event.EventBooking;
import com.sliit.smartcampus.event.EventBookingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/email")
public class AdminEmailController {

    private final EventBookingRepository bookingRepository;
    private final CampusEventRepository eventRepository;
    private final EmailService emailService;

    public AdminEmailController(EventBookingRepository bookingRepository,
                                CampusEventRepository eventRepository,
                                EmailService emailService) {
        this.bookingRepository = bookingRepository;
        this.eventRepository = eventRepository;
        this.emailService = emailService;
    }

    @PostMapping("/bookings/{id}/send")
    public ResponseEntity<String> sendBookingEmail(@PathVariable("id") String bookingId) {
        EventBooking b = bookingRepository.findById(bookingId).orElse(null);
        if (b == null) return ResponseEntity.notFound().build();
        CampusEvent ev = eventRepository.findById(b.getEventId()).orElse(new CampusEvent());
        if (b.getUser() != null) {
            emailService.sendBookingConfirmation(b.getUser(), b, ev);
            return ResponseEntity.ok("Email sent (attempt)");
        }
        if (b.getGuestEmail() != null && !b.getGuestEmail().isBlank()) {
            // create a dummy User-like wrapper? EmailService expects User; we can't easily create one.
            return ResponseEntity.badRequest().body("Booking is for guest; use user bookings for testing");
        }
        return ResponseEntity.badRequest().body("No recipient available");
    }
}
