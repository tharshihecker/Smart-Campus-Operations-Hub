package com.sliit.smartcampus.event;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
public class EventBookingController {
    private final EventBookingService bookingService;
    private final EventBookingRepository bookingRepository;
    private final CampusEventRepository campusEventRepository;

    public EventBookingController(EventBookingService bookingService, EventBookingRepository bookingRepository, CampusEventRepository campusEventRepository) {
        this.bookingService = bookingService;
        this.bookingRepository = bookingRepository;
        this.campusEventRepository = campusEventRepository;
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
                "qrToken", booking.getQrToken(),
                "message", message
        );
    }

    /** Public: look up booking details by QR token (used by scan modal for both user and admin) */
    @GetMapping("/bookings/scan/{token}")
    public org.springframework.http.ResponseEntity<Map<String, Object>> getBookingByToken(@PathVariable String token) {
        EventBooking b = bookingRepository.findByQrToken(token);
        if (b == null) return org.springframework.http.ResponseEntity.notFound().build();
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("bookingId", b.getId());
        result.put("bookingNumber", b.getBookingNumber());
        result.put("status", b.getStatus().name());
        result.put("seatNumber", b.getSeatNumber());
        result.put("checkedInAt", b.getCheckedInAt() != null ? b.getCheckedInAt().toString() : null);
        result.put("createdAt", b.getCreatedAt() != null ? b.getCreatedAt().toString() : null);
        // attendee info
        if (b.getUser() != null) {
            result.put("attendeeName", b.getUser().getFullName());
            result.put("attendeeEmail", b.getUser().getEmail());
        } else {
            result.put("attendeeName", b.getGuestName());
            result.put("attendeeEmail", b.getGuestEmail());
        }
        result.put("studentNumber", b.getStudentNumber());
        result.put("nic", b.getNic());
        // event info
        var evOpt = campusEventRepository.findById(b.getEventId());
        if (evOpt.isPresent()) {
            var ev = evOpt.get();
            result.put("eventTitle", ev.getTitle());
            result.put("eventDate", ev.getEventDate());
            result.put("eventLocation", ev.getLocation());
            result.put("eventStartTime", ev.getStartTime());
            result.put("eventEndTime", ev.getEndTime());
        }
        // validation messages
        if (b.getStatus() == EventBooking.BookingStatus.CANCELLED) {
            result.put("error", "This booking has been cancelled");
        } else if (b.getStatus() == EventBooking.BookingStatus.CHECKED_IN) {
            result.put("warning", "Already checked in at " + b.getCheckedInAt());
        } else if (b.getStatus() == EventBooking.BookingStatus.WAITLISTED) {
            result.put("error", "This booking is waitlisted and cannot be checked in");
        }
        return org.springframework.http.ResponseEntity.ok(result);
    }

    @PostMapping("/bookings/scan")
    public Map<String, Object> scanQr(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String adminId = body.get("adminId");
        var booking = bookingService.confirmBookingByQr(token, adminId);
        return Map.of("message", "Check-in confirmed", "bookingId", booking.getId(), "bookingNumber", booking.getBookingNumber());
    }

    @GetMapping(path = "/bookings/{bookingId}/qr", produces = "image/png")
    public org.springframework.http.ResponseEntity<byte[]> getBookingQr(@PathVariable String bookingId) {
        var ob = bookingRepository.findById(bookingId);
        if (ob.isEmpty() || ob.get().getQrToken() == null) return org.springframework.http.ResponseEntity.notFound().build();
        String token = ob.get().getQrToken();
        return proxyQrImage(token);
    }

    @GetMapping(path = "/bookings/qr", produces = "image/png")
    public org.springframework.http.ResponseEntity<byte[]> getQrByToken(@RequestParam String token) {
        if (token == null || token.isBlank()) return org.springframework.http.ResponseEntity.badRequest().build();
        return proxyQrImage(token);
    }

    private org.springframework.http.ResponseEntity<byte[]> proxyQrImage(String token) {
        try {
            // Generate QR code locally using zxing
            byte[] qrImage = generateQrCode(token);
            return org.springframework.http.ResponseEntity.ok()
                    .header("Cache-Control", "no-cache")
                    .contentType(org.springframework.http.MediaType.IMAGE_PNG)
                    .body(qrImage);
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private byte[] generateQrCode(String text) throws WriterException, IOException {
        // Generate QR code with full URL for admin check-in
        String qrData = "http://localhost:3000/admin/event-checkin?qr=" + text;
        QRCodeWriter qrWriter = new QRCodeWriter();
        BitMatrix matrix = qrWriter.encode(qrData, BarcodeFormat.QR_CODE, 400, 400);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            return baos.toByteArray();
        }
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
