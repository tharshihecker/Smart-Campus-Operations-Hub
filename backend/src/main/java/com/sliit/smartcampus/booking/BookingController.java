package com.sliit.smartcampus.booking;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * User-facing Booking REST Controller.
 * Endpoints: /api/bookings/**
 */
@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingService bookingService;
    private final BookingRepository bookingRepository;

    public BookingController(BookingService bookingService, BookingRepository bookingRepository) {
        this.bookingService = bookingService;
        this.bookingRepository = bookingRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse create(@Valid @RequestBody BookingRequest request) {
        return bookingService.createBooking(request);
    }

    @GetMapping("/user/{userId}")
    public List<BookingResponse> getUserBookings(@PathVariable String userId) {
        return bookingService.getUserBookings(userId);
    }

    @GetMapping("/facility/{facilityId}")
    public List<BookingResponse> getFacilityBookings(
            @PathVariable String facilityId,
            @RequestParam(required = false) String date) {
        if (date != null && !date.isBlank()) {
            return bookingService.getFacilityBookingsByDate(facilityId, LocalDate.parse(date));
        }
        return bookingService.getFacilityBookings(facilityId);
    }

    /**
     * Real-time availability: returns seat counts for a facility on a specific date+time window.
     * GET /api/bookings/facility/{facilityId}/availability?date=2025-04-10&startTime=08:00&endTime=12:00
     */
    @GetMapping("/facility/{facilityId}/availability")
    public Map<String, Object> getAvailability(
            @PathVariable String facilityId,
            @RequestParam String date,
            @RequestParam String startTime,
            @RequestParam String endTime) {
        return bookingService.getAvailability(
                facilityId,
                LocalDate.parse(date),
                LocalTime.parse(startTime),
                LocalTime.parse(endTime)
        );
    }
    @GetMapping("/{bookingId}")
    public BookingResponse getById(@PathVariable String bookingId) {
        return bookingRepository.findById(bookingId)
                .map(BookingResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
    }

    @PutMapping("/{bookingId}")
    public BookingResponse update(@PathVariable String bookingId, @Valid @RequestBody BookingRequest request) {
        return bookingService.updateBooking(bookingId, request);
    }
    @PutMapping("/{bookingId}/cancel")
    public BookingResponse cancel(@PathVariable String bookingId, @RequestParam String userId) {
        return bookingService.cancelBooking(bookingId, userId);
    }

    /**
     * Generate a QR code PNG (base64) for an APPROVED booking.
     * The QR encodes: "SMARTCAMPUS-BOOKING:{bookingId}:{facilityName}:{date}"
     */
    @GetMapping("/{bookingId}/qr")
    public ResponseEntity<?> getBookingQR(@PathVariable String bookingId, Authentication auth) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (booking.getStatus() != BookingStatus.APPROVED && booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "QR code is only available for APPROVED bookings");
        }

        try {
            String qrContent = String.format(
                    "SMARTCAMPUS-BOOKING\nID: %s\nFacility: %s\nDate: %s\nTime: %s - %s\nUser: %s",
                    booking.getId(),
                    booking.getFacility().getName(),
                    booking.getBookingDate(),
                    booking.getStartTime(),
                    booking.getEndTime(),
                    booking.getUser().getUsername()
            );

            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(qrContent, BarcodeFormat.QR_CODE, 250, 250);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            String base64 = Base64.getEncoder().encodeToString(baos.toByteArray());

            return ResponseEntity.ok(Map.of(
                    "bookingId", bookingId,
                    "qrBase64", "data:image/png;base64," + base64,
                    "facilityName", booking.getFacility().getName(),
                    "bookingDate", booking.getBookingDate().toString(),
                    "status", booking.getStatus().name()
            ));
        } catch (WriterException | IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate QR code");
        }
    }

    /**
     * Check in for a booking using QR verification (marks APPROVED → CHECKED_IN).
     * Only valid on the actual booking date.
     */
    @PostMapping("/{bookingId}/checkin")
    public ResponseEntity<?> checkIn(@PathVariable String bookingId, @RequestParam String userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (!booking.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only check in to your own bookings");
        }

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only APPROVED bookings can be checked in (current: " + booking.getStatus() + ")");
        }

        if (!booking.getBookingDate().equals(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-in is only allowed on the booking date");
        }

        booking.setStatus(BookingStatus.CHECKED_IN);
        bookingRepository.save(booking);

        return ResponseEntity.ok(Map.of(
                "message", "✅ Checked in successfully!",
                "bookingId", bookingId,
                "facilityName", booking.getFacility().getName(),
                "status", "CHECKED_IN"
        ));
    }
}
