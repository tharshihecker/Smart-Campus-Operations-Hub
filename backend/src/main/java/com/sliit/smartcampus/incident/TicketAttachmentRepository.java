package com.sliit.smartcampus.incident;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TicketAttachmentRepository extends MongoRepository<TicketAttachment, String> {
}
