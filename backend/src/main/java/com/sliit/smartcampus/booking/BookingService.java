package com.sliit.smartcampus.booking;

import com.sliit.smartcampus.facility.Facility;
import com.sliit.smartcampus.facility.FacilityRepository;
import com.sliit.smartcampus.facility.ResourceStatus;
import com.sliit.smartcampus.notification.NotificationService;
import com.sliit.smartcampus.notification.NotificationType;
import com.sliit.smartcampus.user.User;
import com.sliit.smartcampus.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class BookingService {
    private final BookingRepository bookingRepository;
    private final FacilityRepository facilityRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public BookingService(BookingRepository bookingRepository,
                          FacilityRepository facilityRepository,
                          UserRepository userRepository,
                          NotificationService notificationService) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public BookingResponse createBooking(BookingRequest request) {
        // Validate required fields
        String facilityId = request.getFacilityId();
        if (facilityId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "facilityId is required");

        String userId = request.getUserId();
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId is required");

        if (request.getBookingDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bookingDate is required");
        }

        if (request.getStartTime() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startTime is required");
        }

        if (request.getEndTime() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime is required");
        }

        // Validate time ordering
        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be before end time");
        }

        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facility not found"));

        if (facility.getStatus() != ResourceStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Facility is not available for booking (status: " + facility.getStatus() + ")");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (request.getBookingDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot book for a past date");
        }

        if (request.getStartTime().isBefore(facility.getAvailableFrom()) ||
            request.getEndTime().isAfter(facility.getAvailableTo())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Booking time must be within facility availability: " +
                    facility.getAvailableFrom() + " - " + facility.getAvailableTo());
        }

        int requestedSeats = (request.getAttendeeCount() != null && request.getAttendeeCount() > 0)
                ? request.getAttendeeCount() : 1;

        if (requestedSeats > facility.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Attendee count (" + requestedSeats + ") exceeds facility total capacity of " + facility.getCapacity());
        }

        // Seat-based capacity check: sum attendees of all overlapping bookings on same date+time
        List<Booking> overlapping = bookingRepository.findOverlappingBookings(
                facilityId, request.getBookingDate(), request.getStartTime(), request.getEndTime());
        int usedSeats = overlapping.stream()
                .mapToInt(b -> b.getAttendeeCount() != null ? b.getAttendeeCount() : 1)
                .sum();
        int remainingSeats = facility.getCapacity() - usedSeats;
        if (requestedSeats > remainingSeats) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Not enough seats available. Requested: " + requestedSeats +
                    ", Available: " + Math.max(0, remainingSeats) +
                    " (Capacity: " + facility.getCapacity() + ", Already booked: " + usedSeats + ")");
        }

        Booking booking = new Booking();
        booking.setFacility(facility);
        booking.setUser(user);
        booking.setBookingDate(request.getBookingDate());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPurpose(request.getPurpose());
        booking.setNotes(request.getNotes());
        booking.setAttendeeCount(request.getAttendeeCount());
        booking.setStatus(BookingStatus.PENDING);

        return BookingResponse.from(bookingRepository.save(booking));
    }

    /**
     * Returns real-time availability info for a facility on a given date and time window.
     * Used by the frontend booking panel to show live seat counts.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getAvailability(String facilityId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facility not found"));

        List<Booking> overlapping = bookingRepository.findOverlappingBookings(
                facilityId, date, startTime, endTime);
        int usedSeats = overlapping.stream()
                .mapToInt(b -> b.getAttendeeCount() != null ? b.getAttendeeCount() : 1)
                .sum();
        int remaining = Math.max(0, facility.getCapacity() - usedSeats);

        Map<String, Object> result = new HashMap<>();
        result.put("facilityId", facilityId);
        result.put("date", date.toString());
        result.put("startTime", startTime.toString());
        result.put("endTime", endTime.toString());
        result.put("totalCapacity", facility.getCapacity());
        result.put("usedSeats", usedSeats);
        result.put("remainingSeats", remaining);
        result.put("availableFrom", facility.getAvailableFrom().toString());
        result.put("availableTo", facility.getAvailableTo().toString());
        result.put("overlappingBookings", overlapping.size());
        return result;
    }

    /**
     * Returns all active bookings for a facility on a date (for frontend capacity check).
     */
    @Transactional(readOnly = true)
    public List<BookingResponse> getFacilityBookingsByDate(String facilityId, LocalDate date) {
        return bookingRepository.findActiveBookingsByFacilityAndDate(facilityId, date)
                .stream().map(BookingResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getUserBookings(String userId) {
        return bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(userId)
                .stream().map(BookingResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getFacilityBookings(String facilityId) {
        return bookingRepository.findByFacilityIdOrderByBookingDateDesc(facilityId)
                .stream().map(BookingResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(BookingResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getBookingsByStatus(BookingStatus status) {
        return bookingRepository.findByStatusOrderByCreatedAtDesc(status)
                .stream().map(BookingResponse::from).toList();
    }

    public BookingResponse cancelBooking(String bookingId, String userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (!booking.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only cancel your own bookings");
        }

        // Rule 4: Only PENDING bookings can be cancelled by user.
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot cancel a " + booking.getStatus() + " booking. Only PENDING bookings can be cancelled.");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return BookingResponse.from(bookingRepository.save(booking));
    }

    public BookingResponse updateBooking(String bookingId, BookingRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        // Rule 1: If booking.status == "APPROVED", User is NOT allowed to cancel or update.
        if (booking.getStatus() == BookingStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Approved bookings cannot be updated.");
        }

        // Rule 1: Only PENDING bookings can be updated.
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING bookings can be updated. Current status: " + booking.getStatus());
        }

        // Validate time ordering
        if (request.getStartTime() != null && request.getEndTime() != null) {
            if (!request.getStartTime().isBefore(request.getEndTime())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be before end time");
            }
        }

        LocalDate date = request.getBookingDate() != null ? request.getBookingDate() : booking.getBookingDate();
        LocalTime start = request.getStartTime() != null ? request.getStartTime() : booking.getStartTime();
        LocalTime end = request.getEndTime() != null ? request.getEndTime() : booking.getEndTime();

        if (date.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot book for a past date");
        }

        Facility facility = booking.getFacility();
        if (start.isBefore(facility.getAvailableFrom()) || end.isAfter(facility.getAvailableTo())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Booking time must be within facility availability: " +
                    facility.getAvailableFrom() + " - " + facility.getAvailableTo());
        }

        // Rule 2 & 3: Conflict validation
        List<Booking> overlapping = bookingRepository.findOverlappingBookings(
                facility.getId(), date, start, end);
        
        // Exclude the current booking from overlap check
        boolean hasConflict = overlapping.stream()
                .anyMatch(b -> !b.getId().equals(bookingId));

        if (hasConflict) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Selected time slot is not available.");
        }

        // Update fields
        if (request.getBookingDate() != null) booking.setBookingDate(request.getBookingDate());
        if (request.getStartTime() != null) booking.setStartTime(request.getStartTime());
        if (request.getEndTime() != null) booking.setEndTime(request.getEndTime());
        if (request.getPurpose() != null) booking.setPurpose(request.getPurpose());
        if (request.getNotes() != null) booking.setNotes(request.getNotes());
        if (request.getAttendeeCount() != null) booking.setAttendeeCount(request.getAttendeeCount());

        return BookingResponse.from(bookingRepository.save(booking));
    }
    public BookingResponse updateBookingStatus(String bookingId, BookingStatus newStatus, String adminRemarks) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        booking.setStatus(newStatus);
        if (adminRemarks != null && !adminRemarks.isBlank()) {
            booking.setAdminRemarks(adminRemarks);
        }
        Booking saved = bookingRepository.save(booking);

        // Send notification to user
        String facilityName = booking.getFacility().getName();
        String title;
        String message;
        NotificationType type;

        if (newStatus == BookingStatus.APPROVED) {
            title = "Booking Approved ✓";
            message = "Your booking for '" + facilityName + "' on " + booking.getBookingDate() + " has been approved.";
            type = NotificationType.BOOKING_APPROVED;
        } else if (newStatus == BookingStatus.REJECTED) {
            title = "Booking Rejected";
            message = "Your booking for '" + facilityName + "' has been rejected" +
                      (adminRemarks != null ? ": " + adminRemarks : ".");
            type = NotificationType.BOOKING_REJECTED;
        } else {
            title = "Booking Updated";
            message = "Your booking for '" + facilityName + "' status changed to " + newStatus.name();
            type = NotificationType.SYSTEM;
        }

        notificationService.createNotification(booking.getUser(), title, message, type, bookingId, "BOOKING");

        return BookingResponse.from(saved);
    }

    public void deleteBooking(String bookingId) {
        if (!bookingRepository.existsById(bookingId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        bookingRepository.deleteById(bookingId);
    }
}
