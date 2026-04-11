package com.sliit.smartcampus.repository;

import com.sliit.smartcampus.model.IncidentTicket;
import com.sliit.smartcampus.model.TicketStatus;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface IncidentTicketRepository extends MongoRepository<IncidentTicket, String> {
    List<IncidentTicket> findByReporterIdOrderByCreatedAtDesc(String reporterId);
    List<IncidentTicket> findByAssigneeIdOrderByCreatedAtDesc(String assigneeId);
    List<IncidentTicket> findByStatusOrderByCreatedAtDesc(TicketStatus status);
    List<IncidentTicket> findAllByOrderByCreatedAtDesc();

}



