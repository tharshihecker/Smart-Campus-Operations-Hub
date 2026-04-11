package com.sliit.smartcampus.event;

import com.sliit.smartcampus.user.User;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "event_bookings")
public class EventBooking {
    @Id
    private String id;

    private String eventId;

    @DBRef
    private User user;

    private String bookingNumber;

    // Guest/booking details (for users or guests)
    private String studentNumber;
    private String nic;
    private String guestName;
    private String guestEmail;

    // Assigned seat/site number (1..capacity) when booking is confirmed
    private Integer seatNumber;

    public enum BookingStatus {
        CONFIRMED,
        WAITLISTED,
        CHECKED_IN,
        CANCELLED
    }

    private BookingStatus status = BookingStatus.CONFIRMED;

    // QR token sent to user for check-in (single-use)
    private String qrToken;

    // Timestamp when user checked in via QR
    private java.time.LocalDateTime checkedInAt;

    @CreatedDate
    private LocalDateTime createdAt;

    public String getId() { return id; }
    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getBookingNumber() { return bookingNumber; }
    public void setBookingNumber(String bookingNumber) { this.bookingNumber = bookingNumber; }
    public String getStudentNumber() { return studentNumber; }
    public void setStudentNumber(String studentNumber) { this.studentNumber = studentNumber; }
    public String getNic() { return nic; }
    public void setNic(String nic) { this.nic = nic; }
    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }
    public String getGuestEmail() { return guestEmail; }
    public void setGuestEmail(String guestEmail) { this.guestEmail = guestEmail; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public Integer getSeatNumber() { return seatNumber; }
    public void setSeatNumber(Integer seatNumber) { this.seatNumber = seatNumber; }

    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }

    public String getQrToken() { return qrToken; }
    public void setQrToken(String qrToken) { this.qrToken = qrToken; }

    public java.time.LocalDateTime getCheckedInAt() { return checkedInAt; }
    public void setCheckedInAt(java.time.LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }
}
