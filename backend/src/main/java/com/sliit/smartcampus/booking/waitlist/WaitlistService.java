package com.sliit.smartcampus.booking.waitlist;

import com.sliit.smartcampus.booking.Booking;
import com.sliit.smartcampus.booking.BookingRepository;
import com.sliit.smartcampus.booking.BookingStatus;
import com.sliit.smartcampus.email.EmailService;
import com.sliit.smartcampus.facility.Facility;
import com.sliit.smartcampus.facility.FacilityRepository;
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
import java.util.List;

@Service
@Transactional
public class WaitlistService {

    private final WaitlistRepository waitlistRepository;
    private final FacilityRepository facilityRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    public WaitlistService(WaitlistRepository waitlistRepository,
                           FacilityRepository facilityRepository,
                           UserRepository userRepository,
                           BookingRepository bookingRepository,
                           NotificationService notificationService,
                           EmailService emailService) {
        this.waitlistRepository = waitlistRepository;
        this.facilityRepository = facilityRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    /** Join waitlist for a facility/date/time */
    public WaitlistResponse joinWaitlist(String facilityId, String userId, LocalDate date,
                                          LocalTime startTime, LocalTime endTime,
                                          String purpose, Integer attendeeCount) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facility not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Check not already on waitlist for this exact slot
        boolean already = waitlistRepository.existsByFacilityIdAndUserIdAndBookingDateAndStartTimeAndEndTimeAndStatusIn(
                facilityId, userId, date, startTime, endTime, List.of(WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED));
        if (already) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You are already on the waitlist for this slot.");
        }

        Waitlist entry = new Waitlist();
        entry.setFacility(facility);
        entry.setUser(user);
        entry.setBookingDate(date);
        entry.setStartTime(startTime);
        entry.setEndTime(endTime);
        entry.setPurpose(purpose);
        entry.setAttendeeCount(attendeeCount != null ? attendeeCount : 1);
        entry.setStatus(WaitlistStatus.WAITING);

        Waitlist saved = waitlistRepository.save(entry);

        notificationService.createNotification(user,
                "Added to Waitlist ⏳",
                "You've been added to the waitlist for " + facility.getName() + " on " + date
                + " (" + startTime + " – " + endTime + "). We'll notify you if a slot opens up!",
                NotificationType.SYSTEM, saved.getId(), "WAITLIST");

        return WaitlistResponse.from(saved);
    }

    /** Cancel a waitlist entry */
    public void cancelWaitlist(String waitlistId, String userId) {
        Waitlist w = waitlistRepository.findById(waitlistId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Waitlist entry not found"));
        if (!w.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your waitlist entry");
        }
        w.setStatus(WaitlistStatus.CANCELLED);
        waitlistRepository.save(w);
    }

    /** Get user's waitlist entries */
    @Transactional(readOnly = true)
    public List<WaitlistResponse> getUserWaitlist(String userId) {
        return waitlistRepository.findActiveUserWaitlist(userId)
                .stream().map(WaitlistResponse::from).toList();
    }

    /**
     * Called when a booking is cancelled. Finds next WAITING entry for the same slot
     * and notifies them. Creates a real booking for them automatically.
     */
    public void processWaitlistForCancelledBooking(Booking cancelledBooking) {
        String facilityId = cancelledBooking.getFacility().getId();
        LocalDate date = cancelledBooking.getBookingDate();
        LocalTime start = cancelledBooking.getStartTime();
        LocalTime end = cancelledBooking.getEndTime();

        List<Waitlist> waiting = waitlistRepository.findWaitingByFacilityAndSlot(facilityId, date, start, end);
        if (waiting.isEmpty()) return;

        Waitlist next = waiting.get(0); // First in queue
        next.setStatus(WaitlistStatus.NOTIFIED);
        waitlistRepository.save(next);

        // Automatically create a PENDING booking for them
        Booking newBooking = new Booking();
        newBooking.setFacility(cancelledBooking.getFacility());
        newBooking.setUser(next.getUser());
        newBooking.setBookingDate(date);
        newBooking.setStartTime(start);
        newBooking.setEndTime(end);
        newBooking.setPurpose(next.getPurpose());
        newBooking.setAttendeeCount(next.getAttendeeCount());
        newBooking.setStatus(BookingStatus.PENDING);
        Booking saved = bookingRepository.save(newBooking);

        next.setStatus(WaitlistStatus.CONVERTED);
        waitlistRepository.save(next);

        notificationService.createNotification(next.getUser(),
                "Slot Available! Your Waitlist Booking 🎉",
                "A slot opened up for " + cancelledBooking.getFacility().getName() + " on " + date
                + " (" + start + " – " + end + "). A new booking has been automatically created for you and is pending admin approval!",
                NotificationType.BOOKING_APPROVED, saved.getId(), "BOOKING");

        emailService.sendBookingEmail(next.getUser(), saved,
                "Waitlist Slot Available – Booking Created",
                buildWaitlistNotifyEmail(next, saved), false);
    }

    /**
     * Called when a booking is updated to a smaller attendeeCount or a different slot.
     * Notifies ALL waiting entries for the same slot that space has opened up.
     */
    public void notifyWaitlistForCapacityIncrease(String facilityId, LocalDate date, LocalTime start, LocalTime end) {
        List<Waitlist> waiting = waitlistRepository.findWaitingByFacilityAndSlot(facilityId, date, start, end);
        if (waiting.isEmpty()) return;

        Facility facility = facilityRepository.findById(facilityId).orElse(null);
        if (facility == null) return;

        for (Waitlist w : waiting) {
            notificationService.createNotification(w.getUser(),
                    "Space Available! 🟢",
                    "Good news! Space has opened up for " + facility.getName() + " on " + date
                    + " (" + start + " – " + end + "). Click here to book now!",
                    NotificationType.SYSTEM, facilityId, "WAITLIST_OPEN");
        }
    }

    private String buildWaitlistNotifyEmail(Waitlist w, Booking b) {
        return "<p>Hello " + w.getUser().getFullName() + ",</p>"
                + "<p>Great news! A slot just opened up for <strong>" + w.getFacility().getName() + "</strong>.</p>"
                + "<p><strong>Date:</strong> " + b.getBookingDate() + "<br/>"
                + "<strong>Time:</strong> " + b.getStartTime() + " – " + b.getEndTime() + "</p>"
                + "<p>A new <strong>PENDING</strong> booking has been automatically created for you. "
                + "It requires admin approval — you will be notified once reviewed.</p>"
                + "<p>Thank you,<br/>Smart Campus Team</p>";
    }
}
