package com.sliit.smartcampus.booking;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface BookingRepository extends MongoRepository<Booking, String> {
    List<Booking> findByUserIdOrderByBookingDateDescStartTimeDesc(String userId);
    List<Booking> findByFacilityIdOrderByBookingDateDesc(String facilityId);
    List<Booking> findByStatusOrderByCreatedAtDesc(BookingStatus status);
    List<Booking> findAllByOrderByCreatedAtDesc();

    long countByStatus(BookingStatus status);

    /**
     * Find all ACTIVE (PENDING or APPROVED) bookings for a facility on a given date
     * whose time window overlaps with [startTime, endTime).
     * Used to sum attendee counts and enforce seat-based capacity (not hard block).
     */
    @Query("{ 'facility.$id': { $oid: ?0 }, 'bookingDate': ?1, 'status': { $in: ['PENDING','APPROVED','CHECKED_IN'] }, 'startTime': { $lt: ?3 }, 'endTime': { $gt: ?2 } }")
    List<Booking> findOverlappingBookings(
            String facilityId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime
    );

    /**
     * All active bookings for a facility on a specific date (for availability endpoint).
     */
    @Query("{ 'facility.$id': { $oid: ?0 }, 'bookingDate': ?1, 'status': { $in: ['PENDING','APPROVED','CHECKED_IN'] } }")
    List<Booking> findActiveBookingsByFacilityAndDate(String facilityId, LocalDate date);

    @Query(value = "{ 'bookingDate': ?0, 'status': { $in: ['PENDING','APPROVED'] } }", count = true)
    long countBookingsForDate(LocalDate date);

    @Query(value = "{ 'bookingDate': { $gte: ?0, $lte: ?1 } }", sort = "{ 'bookingDate': 1, 'startTime': 1 }")
    List<Booking> findBookingsInRange(LocalDate startDate, LocalDate endDate);

    List<Booking> findByStatusAndBookingDateBetweenOrderByBookingDateAscStartTimeAsc(
            BookingStatus status,
            LocalDate startDate,
            LocalDate endDate
    );
}
