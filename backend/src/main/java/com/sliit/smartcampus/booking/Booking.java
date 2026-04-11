package com.sliit.smartcampus.booking;

import com.sliit.smartcampus.facility.Facility;
import com.sliit.smartcampus.user.User;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Document(collection = "bookings")
public class Booking {
    @Id
    private String id;

    @DBRef
    private Facility facility;

    @DBRef
    private User user;

    private LocalDate bookingDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private String purpose;

    private String notes;

    private Integer attendeeCount;

    private BookingStatus status = BookingStatus.PENDING;

    private String adminRemarks;
    
    private String qrToken;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private LocalDateTime reminderSentAt;

    // Counter-proposal fields (set by admin when proposing an alternative slot)
    private LocalDate counterProposedDate;
    private LocalTime counterProposedStartTime;
    private LocalTime counterProposedEndTime;
    private String counterProposalNote;
    public String getId() { return id; }
    public Facility getFacility() { return facility; }
    public void setFacility(Facility facility) { this.facility = facility; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDate getBookingDate() { return bookingDate; }
    public void setBookingDate(LocalDate bookingDate) { this.bookingDate = bookingDate; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Integer getAttendeeCount() { return attendeeCount; }
    public void setAttendeeCount(Integer attendeeCount) { this.attendeeCount = attendeeCount; }
    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }
    public String getAdminRemarks() { return adminRemarks; }
    public void setAdminRemarks(String adminRemarks) { this.adminRemarks = adminRemarks; }
    public String getQrToken() { return qrToken; }
    public void setQrToken(String qrToken) { this.qrToken = qrToken; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getReminderSentAt() { return reminderSentAt; }
    public void setReminderSentAt(LocalDateTime reminderSentAt) { this.reminderSentAt = reminderSentAt; }
    public LocalDate getCounterProposedDate() { return counterProposedDate; }
    public void setCounterProposedDate(LocalDate counterProposedDate) { this.counterProposedDate = counterProposedDate; }
    public LocalTime getCounterProposedStartTime() { return counterProposedStartTime; }
    public void setCounterProposedStartTime(LocalTime counterProposedStartTime) { this.counterProposedStartTime = counterProposedStartTime; }
    public LocalTime getCounterProposedEndTime() { return counterProposedEndTime; }
    public void setCounterProposedEndTime(LocalTime counterProposedEndTime) { this.counterProposedEndTime = counterProposedEndTime; }
    public String getCounterProposalNote() { return counterProposalNote; }
    public void setCounterProposalNote(String counterProposalNote) { this.counterProposalNote = counterProposalNote; }
}
