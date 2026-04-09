package com.sliit.smartcampus.booking;

import com.sliit.smartcampus.email.EmailService;
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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class BookingService {
    private final BookingRepository bookingRepository;
    private final FacilityRepository facilityRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private com.sliit.smartcampus.booking.waitlist.WaitlistService waitlistService;

    @org.springframework.beans.factory.annotation.Autowired
    public void setWaitlistService(com.sliit.smartcampus.booking.waitlist.WaitlistService ws) { this.waitlistService = ws; }

    public BookingService(BookingRepository bookingRepository,
                          FacilityRepository facilityRepository,
                          UserRepository userRepository,
                          NotificationService notificationService,
                          EmailService emailService) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.emailService = emailService;
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

        Booking saved = bookingRepository.save(booking);
        if (user.isNotifBookingUpdates()) {
            emailService.sendBookingEmail(user, saved,
                    "Booking Request Received",
                    buildBookingRequestEmail(saved),
                    false);
        }
        return BookingResponse.from(saved);
    }

    private String buildBookingRequestEmail(Booking booking) {
        return "<p>Hello " + booking.getUser().getFullName() + ",</p>"
                + "<p>Your booking request for <strong>" + booking.getFacility().getName() + "</strong> has been submitted and is awaiting admin approval.</p>"
                + "<p><strong>Date:</strong> " + booking.getBookingDate() + "<br/>"
                + "<strong>Time:</strong> " + booking.getStartTime() + " - " + booking.getEndTime() + "<br/>"
                + "<strong>Attendees:</strong> " + (booking.getAttendeeCount() == null ? 1 : booking.getAttendeeCount()) + "</p>"
                + "<p>We will notify you by email when the booking is approved or rejected.</p>"
                + "<p>Thank you,<br/>Smart Campus Team</p>";
    }

    private String buildBookingApprovalEmail(Booking booking, String adminRemarks) {
        return "<p>Hello " + booking.getUser().getFullName() + ",</p>"
                + "<p>Great news! Your booking for <strong>" + booking.getFacility().getName() + "</strong> has been approved.</p>"
                + "<p><strong>Date:</strong> " + booking.getBookingDate() + "<br/>"
                + "<strong>Time:</strong> " + booking.getStartTime() + " - " + booking.getEndTime() + "</p>"
                + (adminRemarks != null && !adminRemarks.isBlank() ? "<p><strong>Admin remarks:</strong> " + adminRemarks + "</p>" : "")
                + "<p>Please use the attached QR code at the facility entrance for check-in.</p>"
                + "<p><img src=\"cid:bookingQr\" alt=\"Booking QR Code\" style=\"max-width:320px;border:1px solid #ddd;padding:8px;\"/></p>"
                + "<p>See your booking details in the Smart Campus portal.</p>"
                + "<p>Thank you,<br/>Smart Campus Team</p>";
    }

    private String buildBookingRejectionEmail(Booking booking, String adminRemarks) {
        return "<p>Hello " + booking.getUser().getFullName() + ",</p>"
                + "<p>We're sorry, but your booking for <strong>" + booking.getFacility().getName() + "</strong> has been rejected.</p>"
                + "<p><strong>Date:</strong> " + booking.getBookingDate() + "<br/>"
                + "<strong>Time:</strong> " + booking.getStartTime() + " - " + booking.getEndTime() + "</p>"
                + (adminRemarks != null && !adminRemarks.isBlank() ? "<p><strong>Reason:</strong> " + adminRemarks + "</p>" : "")
                + "<p>Please contact support if you need help with a new booking.</p>"
                + "<p>Thank you,<br/>Smart Campus Team</p>";
    }

    private String buildBookingReminderEmail(Booking booking) {
        return "<p>Hello " + booking.getUser().getFullName() + ",</p>"
                + "<p>This is a reminder that your booking for <strong>" + booking.getFacility().getName() + "</strong> starts in about 24 hours.</p>"
                + "<p><strong>Date:</strong> " + booking.getBookingDate() + "<br/>"
                + "<strong>Time:</strong> " + booking.getStartTime() + " - " + booking.getEndTime() + "</p>"
                + "<p>Please bring and use this QR code at the facility entrance for check-in.</p>"
                + "<p><img src=\"cid:bookingQr\" alt=\"Booking QR Code\" style=\"max-width:320px;border:1px solid #ddd;padding:8px;\"/></p>"
                + "<p>Thank you,<br/>Smart Campus Team</p>";
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
        Booking saved = bookingRepository.save(booking);
        if (waitlistService != null) waitlistService.processWaitlistForCancelledBooking(saved);
        return BookingResponse.from(saved);
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
        
        // Generate QR token when booking is approved
        if (newStatus == BookingStatus.APPROVED && (booking.getQrToken() == null || booking.getQrToken().isBlank())) {
            booking.setQrToken(UUID.randomUUID().toString());
        }
        
        Booking saved = bookingRepository.save(booking);

        // Send notification to user
        String facilityName = booking.getFacility().getName();
        String title;
        String message;
        NotificationType type;

        if (newStatus == BookingStatus.APPROVED) {
            title = "Booking Approved ✓";
            message = "Your booking for '" + facilityName + "' on " + booking.getBookingDate() + " has been approved"
                    + (adminRemarks != null && !adminRemarks.isBlank() ? ": " + adminRemarks : ".");
            type = NotificationType.BOOKING_APPROVED;
        } else if (newStatus == BookingStatus.REJECTED) {
            title = "Booking Rejected";
            message = "Your booking for '" + facilityName + "' has been rejected" +
                      (adminRemarks != null && !adminRemarks.isBlank() ? ": " + adminRemarks : ".");
            type = NotificationType.BOOKING_REJECTED;
        } else {
            title = "Booking Updated";
            message = "Your booking for '" + facilityName + "' status changed to " + newStatus.name();
            type = NotificationType.SYSTEM;
        }

        notificationService.createNotification(booking.getUser(), title, message, type, bookingId, "BOOKING");

        if (booking.getUser().isNotifBookingUpdates()) {
            if (newStatus == BookingStatus.APPROVED) {
                emailService.sendBookingEmail(booking.getUser(), booking,
                        title,
                        buildBookingApprovalEmail(booking, adminRemarks),
                        true);
            } else if (newStatus == BookingStatus.REJECTED) {
                emailService.sendBookingEmail(booking.getUser(), booking,
                        title,
                        buildBookingRejectionEmail(booking, adminRemarks),
                        false);
            }
        }

        return BookingResponse.from(saved);
    }

    public Map<String, Object> resendBookingEmail(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (booking.getStatus() != BookingStatus.APPROVED && booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "QR email can only be resent for APPROVED or CHECKED_IN bookings. Current status: " + booking.getStatus());
        }

        boolean sent = emailService.sendBookingEmail(booking.getUser(), booking,
                "Booking QR Code Resent",
                buildBookingApprovalEmail(booking, booking.getAdminRemarks()),
                true);

        if (!sent) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Email resend failed. Please verify SMTP username/app password and try again.");
        }

        return Map.of(
                "message", "Booking email resent successfully.",
                "bookingId", bookingId
        );
    }

    public void deleteBooking(String bookingId) {
        if (!bookingRepository.existsById(bookingId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        bookingRepository.deleteById(bookingId);
    }

    public int processUpcomingBookingReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime reminderWindowStart = now.plusHours(24);
        LocalDateTime reminderWindowEnd = reminderWindowStart.plusMinutes(30);
        LocalDate startDate = now.toLocalDate();
        LocalDate endDate = reminderWindowEnd.toLocalDate().plusDays(1);

        List<Booking> candidates = bookingRepository.findByStatusAndBookingDateBetweenOrderByBookingDateAscStartTimeAsc(
                BookingStatus.APPROVED, startDate, endDate);

        int sent = 0;
        for (Booking booking : candidates) {
            if (booking.getReminderSentAt() != null) {
                continue;
            }
            LocalDateTime bookingStart = LocalDateTime.of(booking.getBookingDate(), booking.getStartTime());
            if (bookingStart.isBefore(reminderWindowStart) || !bookingStart.isBefore(reminderWindowEnd)) {
                continue;
            }
            if (!booking.getUser().isNotifBookingUpdates()) {
                continue;
            }
            boolean emailSent = emailService.sendBookingEmail(
                    booking.getUser(),
                    booking,
                    "Booking Reminder (24 Hours): " + booking.getFacility().getName(),
                    buildBookingReminderEmail(booking),
                    true
            );
            if (emailSent) {
                booking.setReminderSentAt(LocalDateTime.now());
                bookingRepository.save(booking);
                sent++;
            }
        }
        return sent;
    }
    /** Admin counter-proposes an alternate time slot */
    public BookingResponse counterPropose(String bookingId, java.time.LocalDate newDate, java.time.LocalTime newStart, java.time.LocalTime newEnd, String note) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING bookings can be counter-proposed.");
        }
        booking.setStatus(BookingStatus.COUNTER_PROPOSED);
        booking.setCounterProposedDate(newDate);
        booking.setCounterProposedStartTime(newStart);
        booking.setCounterProposedEndTime(newEnd);
        booking.setCounterProposalNote(note);
        Booking saved = bookingRepository.save(booking);

        notificationService.createNotification(booking.getUser(),
                "Admin Counter-Proposal ⏰", 
                "Admin has suggested an alternative time for your booking at " + booking.getFacility().getName() 
                + ": " + newDate + " " + newStart + " – " + newEnd + ". Please accept or reject.",
                NotificationType.SYSTEM, saved.getId(), "BOOKING");
        return BookingResponse.from(saved);
    }

    /** User accepts a counter-proposal → updates booking to new slot, resets to PENDING */
    public BookingResponse acceptCounterProposal(String bookingId, String userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (!booking.getUser().getId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your booking");
        if (booking.getStatus() != BookingStatus.COUNTER_PROPOSED)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking is not in COUNTER_PROPOSED state.");
        booking.setBookingDate(booking.getCounterProposedDate());
        booking.setStartTime(booking.getCounterProposedStartTime());
        booking.setEndTime(booking.getCounterProposedEndTime());
        booking.setCounterProposedDate(null);
        booking.setCounterProposedStartTime(null);
        booking.setCounterProposedEndTime(null);
        booking.setCounterProposalNote(null);
        booking.setStatus(BookingStatus.PENDING);
        return BookingResponse.from(bookingRepository.save(booking));
    }

    /** User rejects a counter-proposal → booking is REJECTED */
    public BookingResponse rejectCounterProposal(String bookingId, String userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (!booking.getUser().getId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your booking");
        if (booking.getStatus() != BookingStatus.COUNTER_PROPOSED)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking is not in COUNTER_PROPOSED state.");
        booking.setStatus(BookingStatus.REJECTED);
        booking.setAdminRemarks("User rejected the counter-proposal.");
        return BookingResponse.from(bookingRepository.save(booking));
    }
}
