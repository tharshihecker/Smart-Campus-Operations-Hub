package com.sliit.smartcampus.booking;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/bookings")
public class BookingAdminController {
    private final BookingService bookingService;

    public BookingAdminController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping
    public List<BookingResponse> getAll(@RequestParam(required = false) BookingStatus status) {
        if (status != null) {
            return bookingService.getBookingsByStatus(status);
        }
        return bookingService.getAllBookings();
    }

    @PutMapping("/{bookingId}/status")
    public BookingResponse updateStatus(
            @PathVariable String bookingId,
            @RequestBody Map<String, String> body) {
        BookingStatus newStatus = BookingStatus.valueOf(body.get("status"));
        String adminRemarks = body.get("adminRemarks");
        return bookingService.updateBookingStatus(bookingId, newStatus, adminRemarks);
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
}
