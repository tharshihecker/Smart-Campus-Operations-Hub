package com.sliit.smartcampus.controller;

import com.sliit.smartcampus.dto.BookingResponse;
import com.sliit.smartcampus.model.BookingStatus;
import com.sliit.smartcampus.service.BookingService;
import com.sliit.smartcampus.service.EmailService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
@RestController
@RequestMapping("/api/admin/bookings")
public class BookingAdminController {
    private final BookingService bookingService;
    private final EmailService emailService;

    public BookingAdminController(BookingService bookingService, EmailService emailService) {
        this.bookingService = bookingService;
        this.emailService = emailService;
    }

    @GetMapping
    public List<BookingResponse> getAll(@RequestParam(required = false) BookingStatus status) {
        if (status != null) return bookingService.getBookingsByStatus(status);
        return bookingService.getAllBookings();
    }

    @PutMapping("/{bookingId}/status")
    public BookingResponse updateStatus(@PathVariable String bookingId, @RequestBody Map<String, String> body) {
        BookingStatus newStatus = BookingStatus.valueOf(body.get("status"));
        String adminRemarks = body.get("adminRemarks");
        return bookingService.updateBookingStatus(bookingId, newStatus, adminRemarks);
    }

    /** Admin counter-proposes an alternative time slot */
    @PostMapping("/{bookingId}/counter-propose")
    public BookingResponse counterPropose(@PathVariable String bookingId, @RequestBody Map<String, String> body) {
        LocalDate newDate = LocalDate.parse(body.get("newDate"));
        LocalTime newStart = LocalTime.parse(body.get("newStartTime"));
        LocalTime newEnd = LocalTime.parse(body.get("newEndTime"));
        String note = body.getOrDefault("note", "");
        return bookingService.counterPropose(bookingId, newDate, newStart, newEnd, note);
    }

    @DeleteMapping("/{bookingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String bookingId) {
        bookingService.deleteBooking(bookingId);
    }

    @GetMapping("/statuses")
    public BookingStatus[] getStatuses() {
        return BookingStatus.values();
    }

    @PostMapping("/test-email")
    public Map<String, Object> sendTestEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
        boolean sent = emailService.sendTestEmail(email);
        if (!sent)
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "SMTP test email failed.");
        return Map.of("message", "SMTP test email sent successfully.", "email", email);
    }
}



