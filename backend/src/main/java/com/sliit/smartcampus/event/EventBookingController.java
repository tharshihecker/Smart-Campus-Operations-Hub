package com.sliit.smartcampus.event;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/events")
public class EventBookingController {
    private final EventBookingService bookingService;

    public EventBookingController(EventBookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/{eventId}/book")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> bookEvent(@PathVariable String eventId, @RequestBody Map<String, String> body) {
        String userId = body.get("userId");
        String studentNumber = body.get("studentNumber");
        String nic = body.get("nic");
        String guestName = body.get("guestName");
        String guestEmail = body.get("guestEmail");
        var booking = bookingService.createBooking(eventId, userId, studentNumber, nic, guestName, guestEmail);
        String message = booking.getStatus() == EventBooking.BookingStatus.CONFIRMED ? "Booking confirmed" : "Added to waitlist";
        return Map.of(
            "bookingId", booking.getId(),
            "bookingNumber", booking.getBookingNumber(),
            "status", booking.getStatus().name(),
            "seatNumber", booking.getSeatNumber(),
            "message", message
        );
    }

    @GetMapping("/bookings/user/{userId}")
    public java.util.List<EventBooking> getUserEventBookings(@PathVariable String userId) {
        return bookingService.getUserBookings(userId);
    }

    @PutMapping("/bookings/{bookingId}/cancel")
    public Map<String, Object> cancelBooking(@PathVariable String bookingId, @RequestParam String userId) {
        var booking = bookingService.cancelBooking(bookingId, userId);
        return Map.of("message", "Booking cancelled", "bookingId", booking.getId());
    }
}
