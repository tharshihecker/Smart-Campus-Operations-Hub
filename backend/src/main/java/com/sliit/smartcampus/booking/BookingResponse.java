package com.sliit.smartcampus.booking;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record BookingResponse(
        String id,
        String facilityId,
        String facilityName,
        String facilityLocation,
        String userId,
        String userName,
        LocalDate bookingDate,
        LocalTime startTime,
        LocalTime endTime,
        String purpose,
        String notes,
        Integer attendeeCount,
        BookingStatus status,
        String adminRemarks,
        LocalDateTime createdAt
) {
    public static BookingResponse from(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getFacility().getId(),
                booking.getFacility().getName(),
                booking.getFacility().getLocation(),
                booking.getUser().getId(),
                booking.getUser().getUsername(),
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getPurpose(),
                booking.getNotes(),
                booking.getAttendeeCount(),
                booking.getStatus(),
                booking.getAdminRemarks(),
                booking.getCreatedAt()
        );
    }
}
