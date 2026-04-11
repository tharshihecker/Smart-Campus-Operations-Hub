package com.sliit.smartcampus.service;

import com.sliit.smartcampus.dto.NotificationResponse;
import com.sliit.smartcampus.model.Booking;
import com.sliit.smartcampus.model.CampusEvent;
import com.sliit.smartcampus.model.Facility;
import com.sliit.smartcampus.model.Notification;
import com.sliit.smartcampus.model.NotificationType;
import com.sliit.smartcampus.model.User;
import com.sliit.smartcampus.repository.BookingRepository;
import com.sliit.smartcampus.repository.CampusEventRepository;
import com.sliit.smartcampus.repository.EventBookingRepository;
import com.sliit.smartcampus.repository.NotificationRepository;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final com.sliit.smartcampus.repository.EventBookingRepository eventBookingRepository;
    private final CampusEventRepository campusEventRepository;
    private final BookingRepository bookingRepository;
    private final EmailService emailService;
    private final Environment env;

    public NotificationService(NotificationRepository notificationRepository,
                               com.sliit.smartcampus.repository.EventBookingRepository eventBookingRepository,
                               CampusEventRepository campusEventRepository,
                               BookingRepository bookingRepository,
                               EmailService emailService,
                               Environment env) {
        this.notificationRepository = notificationRepository;
        this.eventBookingRepository = eventBookingRepository;
        this.campusEventRepository = campusEventRepository;
        this.bookingRepository = bookingRepository;
        this.emailService = emailService;
        this.env = env;
    }

    public void createNotification(User user, String title, String message,
                                    NotificationType type, String referenceId, String referenceType) {
        Notification n = new Notification();
        n.setUser(user);
        n.setTitle(title);
        n.setMessage(message);
        n.setType(type);
        n.setReferenceId(referenceId);
        n.setReferenceType(referenceType);
        
        // Extract QR token early for easier frontend access
        String qrToken = null;
        if (referenceType != null && referenceType.equalsIgnoreCase("BOOKING") && referenceId != null) {
            try {
                var bookingOpt = bookingRepository.findById(referenceId);
                if (bookingOpt.isPresent()) {
                    qrToken = bookingOpt.get().getQrToken();
                }
            } catch (Exception ignored) {}
        } else if (referenceType != null && referenceType.equalsIgnoreCase("event_booking") && referenceId != null) {
            try {
                var ebOpt = eventBookingRepository.findById(referenceId);
                if (ebOpt.isPresent()) {
                    qrToken = ebOpt.get().getQrToken();
                }
            } catch (Exception ignored) {}
        }
        n.setQrToken(qrToken);
        
        notificationRepository.save(n);
        
        // Send email for approved bookings only
        boolean mailEnabled = Boolean.parseBoolean(env.getProperty("app.mail.enabled", "true"));
        if (mailEnabled && type == NotificationType.BOOKING_APPROVED) {
            try {
                // Handle facility bookings
                if (referenceType != null && referenceType.equalsIgnoreCase("BOOKING") && referenceId != null) {
                    var bookingOpt = bookingRepository.findById(referenceId);
                    if (bookingOpt.isPresent()) {
                        var booking = bookingOpt.get();
                        try {
                            emailService.sendBookingConfirmation(user, booking);
                        } catch (Exception e) {
                            // log but do not fail notification creation
                        }
                    }
                }
                // Handle event bookings
                else if (referenceType != null && referenceType.equalsIgnoreCase("event_booking") && referenceId != null) {
                    var ebOpt = eventBookingRepository.findById(referenceId);
                    if (ebOpt.isPresent()) {
                        var eb = ebOpt.get();
                        // Fetch the event details
                        com.sliit.smartcampus.model.CampusEvent ev = null;
                        try {
                            if (eb.getEventId() != null) {
                                var eventOpt = campusEventRepository.findById(eb.getEventId());
                                if (eventOpt.isPresent()) {
                                    ev = eventOpt.get();
                                }
                            }
                        } catch (Exception ignored) {
                        }
                        try {
                            // Get event or create minimal event object with title
                            if (ev == null) {
                                ev = new com.sliit.smartcampus.model.CampusEvent();
                                ev.setTitle("Your Event");
                            }
                            emailService.sendBookingConfirmation(user, eb, ev);
                        } catch (Exception e) {
                            // log but do not fail notification creation
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public void markAsRead(String notificationId, String userId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!n.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Cannot modify another user's notification");
        }
        n.setRead(true); // This will call setRead on isRead field
        notificationRepository.save(n);
    }

    public void markAllAsRead(String userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    public void deleteNotification(String notificationId, String userId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!n.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Cannot delete another user's notification");
        }
        notificationRepository.delete(n);
    }

    private NotificationResponse toResponse(Notification n) {
        // Use the stored qrToken directly from Notification
        String qr = n.getQrToken();
        
        // Fallback: try to extract a UUID-looking token from the message text if not stored
        if (qr == null && n.getMessage() != null) {
            try {
                java.util.regex.Pattern p = java.util.regex.Pattern.compile("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
                var m = p.matcher(n.getMessage());
                if (m.find()) qr = m.group(0);
            } catch (Exception ignored) {}
        }
        return new NotificationResponse(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getType().name(),
                n.isRead(),
                n.getReferenceId(),
                n.getReferenceType(),
                n.getCreatedAt(),
                qr
        );
    }
}



