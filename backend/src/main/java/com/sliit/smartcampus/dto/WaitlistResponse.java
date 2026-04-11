package com.sliit.smartcampus.dto;

import com.sliit.smartcampus.model.Waitlist;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
public class WaitlistResponse {
    private String id;
    private String facilityId;
    private String facilityName;
    private String facilityLocation;
    private String userId;
    private String userName;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String purpose;
    private Integer attendeeCount;
    private String status;
    private LocalDateTime createdAt;

    public static WaitlistResponse from(Waitlist w) {
        WaitlistResponse r = new WaitlistResponse();
        r.id = w.getId();
        r.facilityId = w.getFacility().getId();
        r.facilityName = w.getFacility().getName();
        r.facilityLocation = w.getFacility().getLocation();
        r.userId = w.getUser().getId();
        r.userName = w.getUser().getFullName();
        r.bookingDate = w.getBookingDate();
        r.startTime = w.getStartTime();
        r.endTime = w.getEndTime();
        r.purpose = w.getPurpose();
        r.attendeeCount = w.getAttendeeCount();
        r.status = w.getStatus().name();
        r.createdAt = w.getCreatedAt();
        return r;
    }

    public String getId() { return id; }
    public String getFacilityId() { return facilityId; }
    public String getFacilityName() { return facilityName; }
    public String getFacilityLocation() { return facilityLocation; }
    public String getUserId() { return userId; }
    public String getUserName() { return userName; }
    public LocalDate getBookingDate() { return bookingDate; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public String getPurpose() { return purpose; }
    public Integer getAttendeeCount() { return attendeeCount; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}



