package com.sliit.smartcampus.incident;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketCommentRepository extends MongoRepository<TicketComment, String> {
    List<TicketComment> findByTicketIdAndDeletedFalseOrderByCreatedAtAsc(String ticketId);
}
