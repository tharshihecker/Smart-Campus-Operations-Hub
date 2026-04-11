package com.sliit.smartcampus.repository;

import com.sliit.smartcampus.model.TicketAttachment;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
@Repository
public interface TicketAttachmentRepository extends MongoRepository<TicketAttachment, String> {
}



