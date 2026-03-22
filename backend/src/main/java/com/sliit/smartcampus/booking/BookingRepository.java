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

    @Query("{ 'facility.id': ?0, 'bookingDate': ?1, 'status': { $in: ['PENDING','APPROVED'] }, 'startTime': { $lt: ?3 }, 'endTime': { $gt: ?2 } }")
    List<Booking> findConflictingBookings(
            String facilityId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime
    );

    @Query(value = "{ 'bookingDate': ?0, 'status': { $in: ['PENDING','APPROVED'] } }", count = true)
    long countBookingsForDate(LocalDate date);

    @Query(value = "{ 'bookingDate': { $gte: ?0, $lte: ?1 } }", sort = "{ 'bookingDate': 1, 'startTime': 1 }")
    List<Booking> findBookingsInRange(LocalDate startDate, LocalDate endDate);
}
