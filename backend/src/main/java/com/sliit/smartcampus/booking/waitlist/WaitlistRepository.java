package com.sliit.smartcampus.booking.waitlist;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface WaitlistRepository extends MongoRepository<Waitlist, String> {

    List<Waitlist> findByUserIdOrderByCreatedAtDesc(String userId);

    @Query("{ 'facility.id': ?0, 'bookingDate': ?1, 'startTime': ?2, 'endTime': ?3, 'status': 'WAITING' }")
    List<Waitlist> findWaitingByFacilityAndSlot(String facilityId, LocalDate date, LocalTime start, LocalTime end);

    boolean existsByFacilityIdAndUserIdAndBookingDateAndStartTimeAndEndTimeAndStatusIn(
        String facilityId, String userId, LocalDate bookingDate, LocalTime startTime, LocalTime endTime, List<WaitlistStatus> statuses);
}
