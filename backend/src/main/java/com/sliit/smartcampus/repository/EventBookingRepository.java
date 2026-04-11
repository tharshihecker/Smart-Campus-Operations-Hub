package com.sliit.smartcampus.repository;

import com.sliit.smartcampus.model.BookingStatus;
import com.sliit.smartcampus.model.EventBooking;

import org.springframework.data.mongodb.repository.MongoRepository;
public interface EventBookingRepository extends MongoRepository<EventBooking, String> {
    long countByEventId(String eventId);
    Boolean existsByEventIdAndUser_Id(String eventId, String userId);
    Boolean existsByEventIdAndUser_IdAndStatusNot(String eventId, String userId, EventBooking.BookingStatus status);
    java.util.List<EventBooking> findByUser_Id(String userId);
    java.util.List<EventBooking> findByUser_IdAndStatusNot(String userId, EventBooking.BookingStatus status);
    java.util.List<EventBooking> findByEventId(String eventId);
    java.util.List<EventBooking> findByEventIdOrderByCreatedAtAsc(String eventId);
    java.util.List<EventBooking> findByEventIdAndStatusOrderByCreatedAtAsc(String eventId, EventBooking.BookingStatus status);
    EventBooking findByQrToken(String qrToken);
}



