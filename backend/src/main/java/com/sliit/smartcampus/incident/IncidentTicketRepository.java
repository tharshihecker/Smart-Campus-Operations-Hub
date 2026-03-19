package com.sliit.smartcampus.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentTicketRepository extends JpaRepository<IncidentTicket, Long> {
    List<IncidentTicket> findByReporterIdOrderByCreatedAtDesc(Long reporterId);
    List<IncidentTicket> findByAssigneeIdOrderByCreatedAtDesc(Long assigneeId);
    List<IncidentTicket> findByStatusOrderByCreatedAtDesc(TicketStatus status);
    List<IncidentTicket> findAllByOrderByCreatedAtDesc();

    @Query("SELECT t FROM IncidentTicket t WHERE " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:priority IS NULL OR t.priority = :priority) AND " +
           "(:category IS NULL OR LOWER(t.category) LIKE LOWER(CONCAT('%', :category, '%'))) " +
           "ORDER BY t.createdAt DESC")
    List<IncidentTicket> findWithFilters(
            @Param("status") TicketStatus status,
            @Param("priority") TicketPriority priority,
            @Param("category") String category);
}
