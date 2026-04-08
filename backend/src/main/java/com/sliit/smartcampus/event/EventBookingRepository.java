package com.sliit.smartcampus.event;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface EventBookingRepository extends MongoRepository<EventBooking, String> {
    long countByEventId(String eventId);
    boolean existsByEventIdAndUser_Id(String eventId, String userId);
    java.util.List<EventBooking> findByUser_Id(String userId);
    java.util.List<EventBooking> findByEventId(String eventId);
    java.util.List<EventBooking> findByEventIdOrderByCreatedAtAsc(String eventId);
    java.util.List<EventBooking> findByEventIdAndStatusOrderByCreatedAtAsc(String eventId, EventBooking.BookingStatus status);
}
