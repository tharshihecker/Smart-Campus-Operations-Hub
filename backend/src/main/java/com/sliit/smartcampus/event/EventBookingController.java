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
@RequestMapping("/api/event-bookings")
public class EventBookingController {
    private final EventBookingService bookingService;
    private final EventBookingRepository bookingRepository;

    public EventBookingController(EventBookingService bookingService, EventBookingRepository bookingRepository) {
        this.bookingService = bookingService;
        this.bookingRepository = bookingRepository;
    }

    @PostMapping
    public org.springframework.http.ResponseEntity<Map<String, Object>> createBooking(@RequestBody Map<String, String> body) {
        String eventId = body.get("eventId");
        String userId = body.get("userId");
        String studentNumber = body.get("studentNumber");
        String nic = body.get("nic");
        String guestName = body.get("guestName");
        String guestEmail = body.get("guestEmail");
        
        var booking = bookingService.createBooking(eventId, userId, studentNumber, nic, guestName, guestEmail);
        String message = booking.getStatus() == EventBooking.BookingStatus.CONFIRMED ? "Booking confirmed" : "Added to waitlist";
        
        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(Map.of(
                    "bookingId", booking.getId(),
                    "bookingNumber", booking.getBookingNumber(),
                    "status", booking.getStatus().name(),
                    "seatNumber", booking.getSeatNumber() == null ? "N/A" : booking.getSeatNumber(),
                    "qrToken", booking.getQrToken() == null ? "" : booking.getQrToken(),
                    "message", message
                ));
    }

    @GetMapping("/by-token/{token}")
    public org.springframework.http.ResponseEntity<Map<String, Object>> getBookingByToken(@PathVariable String token) {
        return org.springframework.http.ResponseEntity.ok(bookingService.getBookingSummaryByToken(token));
    }

    @PostMapping("/check-in")
    public org.springframework.http.ResponseEntity<Map<String, Object>> scanQr(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String adminId = body.get("adminId");
        var booking = bookingService.confirmBookingByQr(token, adminId);
        return org.springframework.http.ResponseEntity.ok(Map.of(
            "message", "Check-in confirmed", 
            "bookingId", booking.getId(), 
            "bookingNumber", booking.getBookingNumber()
        ));
    }

    @GetMapping(path = "/{bookingId}/qr", produces = "image/png")
    public org.springframework.http.ResponseEntity<byte[]> getBookingQr(@PathVariable String bookingId) {
        EventBooking b = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND));
        
        if (b.getQrToken() == null || b.getQrToken().isBlank()) {
            return org.springframework.http.ResponseEntity.badRequest().build();
        }
        
        return proxyQrImage(b.getQrToken());
    }

    @GetMapping(path = "/qr", produces = "image/png")
    public org.springframework.http.ResponseEntity<byte[]> getQrByToken(@RequestParam String token) {
        if (token == null || token.isBlank()) return org.springframework.http.ResponseEntity.badRequest().build();
        return proxyQrImage(token);
    }

    private org.springframework.http.ResponseEntity<byte[]> proxyQrImage(String token) {
        try {
            byte[] qrImage = bookingService.generateQrCodeImage(token);
            return org.springframework.http.ResponseEntity.ok()
                    .header("Cache-Control", "no-cache")
                    .contentType(org.springframework.http.MediaType.IMAGE_PNG)
                    .body(qrImage);
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/user/{userId}")
    public org.springframework.http.ResponseEntity<java.util.List<EventBooking>> getUserEventBookings(@PathVariable String userId) {
        return org.springframework.http.ResponseEntity.ok(bookingService.getUserBookings(userId));
    }

    @PutMapping("/{bookingId}/cancel")
    public org.springframework.http.ResponseEntity<Map<String, Object>> cancelBooking(@PathVariable String bookingId, @RequestParam String userId) {
        var booking = bookingService.cancelBooking(bookingId, userId);
        return org.springframework.http.ResponseEntity.ok(Map.of("message", "Booking cancelled", "bookingId", booking.getId()));
    }
}
