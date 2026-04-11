package com.sliit.smartcampus.incident;

import com.sliit.smartcampus.exception.ResourceNotFoundException;
import com.sliit.smartcampus.notification.NotificationService;
import com.sliit.smartcampus.notification.NotificationType;
import com.sliit.smartcampus.service.CloudinaryService;
import com.sliit.smartcampus.user.User;
import com.sliit.smartcampus.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@Transactional
public class IncidentTicketService {

    private final IncidentTicketRepository ticketRepository;
    private final TicketCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CloudinaryService cloudinaryService;
    private final TicketAttachmentRepository attachmentRepository;

    public IncidentTicketService(IncidentTicketRepository ticketRepository,
                                  TicketCommentRepository commentRepository,
                                  UserRepository userRepository,
                                  NotificationService notificationService,
                                  CloudinaryService cloudinaryService,
                                  TicketAttachmentRepository attachmentRepository) {
        this.ticketRepository = ticketRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.cloudinaryService = cloudinaryService;
        this.attachmentRepository = attachmentRepository;
    }

    public IncidentTicketResponse createTicket(IncidentTicketRequest request, String reporterId, List<MultipartFile> files) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new ResourceNotFoundException("User", reporterId));

        IncidentTicket ticket = new IncidentTicket();
        ticket.setReporter(reporter);
        ticket.setTitle(request.getTitle());
        ticket.setDescription(request.getDescription());
        ticket.setCategory(request.getCategory());
        ticket.setPriority(request.getPriority() != null ? request.getPriority() : TicketPriority.MEDIUM);
        ticket.setLocation(request.getLocation());
        ticket.setContactDetails(request.getContactDetails());
        ticket.setStatus(TicketStatus.OPEN);

        IncidentTicket saved = ticketRepository.save(ticket);

        // Handle file attachments (max 3) - process in parallel for faster uploads
        if (files != null && !files.isEmpty()) {
            int count = Math.min(files.size(), 3);
            List<MultipartFile> filesToProcess = files.stream().limit(count).filter(f -> !f.isEmpty()).toList();
            
            // Process file uploads in parallel
            List<TicketAttachment> attachments = filesToProcess.parallelStream()
                    .map(file -> {
                        try {
                            TicketAttachment att = saveAttachment(file, saved);
                            return attachmentRepository.save(att);
                        } catch (IOException e) {
                            // log and continue
                            return null;
                        }
                    })
                    .filter(att -> att != null)
                    .toList();
            
            // Add all attachments to ticket
            if (!attachments.isEmpty()) {
                saved.getAttachments().addAll(attachments);
                ticketRepository.save(saved);
            }
        }

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<IncidentTicketResponse> getMyTickets(String userId) {
        return ticketRepository.findByReporterIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public IncidentTicketResponse getTicketById(String ticketId) {
        return toResponse(findTicketOrThrow(ticketId));
    }

    @Transactional(readOnly = true)
    public List<IncidentTicketResponse> getAllTickets(String status, String priority, String category) {
        TicketStatus ts = status != null ? TicketStatus.valueOf(status) : null;
        TicketPriority tp = priority != null ? TicketPriority.valueOf(priority) : null;
        return ticketRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(t -> ts == null || t.getStatus() == ts)
                .filter(t -> tp == null || t.getPriority() == tp)
                .filter(t -> category == null || category.isBlank() || t.getCategory().toLowerCase().contains(category.toLowerCase()))
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<IncidentTicketResponse> getAssignedTickets(String technicianId) {
        return ticketRepository.findByAssigneeIdOrderByCreatedAtDesc(technicianId)
                .stream().map(this::toResponse).toList();
    }

    public IncidentTicketResponse updateStatus(String ticketId, TicketStatus newStatus, String notes, String rejectionReason) {
        IncidentTicket ticket = findTicketOrThrow(ticketId);
        TicketStatus oldStatus = ticket.getStatus();

        ticket.setStatus(newStatus);
        if (notes != null && !notes.isBlank()) ticket.setResolutionNotes(notes);
        if (rejectionReason != null && !rejectionReason.isBlank()) ticket.setRejectionReason(rejectionReason);

        // SLA: record first response time (first move away from OPEN)
        if (oldStatus == TicketStatus.OPEN && newStatus != TicketStatus.OPEN
            && ticket.getFirstResponseAt() == null) {
            ticket.setFirstResponseAt(java.time.LocalDateTime.now());
        }
        // SLA: record resolution time
        if (newStatus == TicketStatus.RESOLVED && ticket.getResolvedAt() == null) {
            ticket.setResolvedAt(java.time.LocalDateTime.now());
        }
        IncidentTicket saved = ticketRepository.save(ticket);

        // Notify reporter
        notificationService.createNotification(
                ticket.getReporter(),
                "Ticket Status Updated",
                "Your ticket '" + ticket.getTitle() + "' is now " + newStatus.name(),
                NotificationType.TICKET_STATUS_CHANGED,
                ticketId, "TICKET"
        );

        return toResponse(saved);
    }

    public IncidentTicketResponse assignTechnician(String ticketId, String technicianId) {
        IncidentTicket ticket = findTicketOrThrow(ticketId);
        User technician = userRepository.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("User", technicianId));
        ticket.setAssignee(technician);
        if (ticket.getStatus() == TicketStatus.OPEN) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
            // SLA: record first response on assignment
            if (ticket.getFirstResponseAt() == null) {
                ticket.setFirstResponseAt(java.time.LocalDateTime.now());
            }
        }
        IncidentTicket saved = ticketRepository.save(ticket);

        // Notify reporter
        String roleName = technician.getRole().name().toLowerCase();
        String assigneeName = technician.getFullName() != null ? technician.getFullName() : "Someone";
        
        notificationService.createNotification(
                ticket.getReporter(),
                "Ticket Assigned",
                assigneeName + " (" + roleName + ") has been assigned to your ticket: " + ticket.getTitle(),
                NotificationType.TICKET_ASSIGNED,
                ticketId, "TICKET"
        );

        // Notify technician when assigned to a ticket
        notificationService.createNotification(
                technician,
                "Ticket Assigned to You",
                "You have been assigned to ticket: " + ticket.getTitle() + " (ID: " + ticket.getId() + ")",
                NotificationType.TICKET_ASSIGNED,
                ticketId, "TICKET"
        );

        return toResponse(saved);
    }

    public TicketCommentResponse addComment(String ticketId, String content, String authorId) {
        IncidentTicket ticket = findTicketOrThrow(ticketId);
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", authorId));

        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setAuthor(author);
        comment.setContent(content);
        TicketComment saved = commentRepository.save(comment);

        // Notify reporter if comment is by someone else
        if (!authorId.equals(ticket.getReporter().getId())) {
            notificationService.createNotification(
                    ticket.getReporter(),
                    "New Comment on Your Ticket",
                    author.getFullName() + " commented on: " + ticket.getTitle(),
                    NotificationType.TICKET_COMMENT_ADDED,
                    ticketId, "TICKET"
            );
        }

        boolean isEscalation = content.contains("ESCALATION REQUEST");
        
        if (isEscalation) {
            ticket.setPriority(TicketPriority.CRITICAL);
            ticketRepository.save(ticket);
        }

        // Notify all ADMIN users when a non-admin user comments on a ticket
        if (author.getRole() != com.sliit.smartcampus.user.UserRole.ADMIN) {
            String notifTitle = isEscalation ? "🚨 EMERGENCY ESCALATION: Ticket #" + ticket.getId() : "💬 New User Comment on Ticket #" + ticket.getId();
            String snippet = isEscalation ? "User flagged issue as critically urgent!" : (content.length() > 50 ? content.substring(0, 50) + "..." : content);
            String notifMsg = author.getFullName() + " on '" + ticket.getTitle() + "': " + snippet;

            List<User> admins = userRepository.findByRole(com.sliit.smartcampus.user.UserRole.ADMIN);
            for (User admin : admins) {
                if (!admin.getId().equals(authorId)) {
                    notificationService.createNotification(
                            admin,
                            notifTitle,
                            notifMsg,
                            NotificationType.TICKET_COMMENT_ADDED,
                            ticketId, "TICKET"
                    );
                }
            }
        }

        // Notify assigned technician when a comment is added to their ticket
        if (ticket.getAssignee() != null && !ticket.getAssignee().getId().equals(authorId)) {
            String notifTitle = isEscalation ? "🚨 ESCALATION: Ticket #" + ticket.getId() : "💬 Comment on Assigned Ticket #" + ticket.getId();
            String snippet = isEscalation ? "User flagged issue as critically urgent!" : (content.length() > 50 ? content.substring(0, 50) + "..." : content);
            String notifMsg = author.getFullName() + " on '" + ticket.getTitle() + "': " + snippet;
            
            notificationService.createNotification(
                    ticket.getAssignee(),
                    notifTitle,
                    notifMsg,
                    NotificationType.TICKET_COMMENT_ADDED,
                    ticketId, "TICKET"
            );
        }

        return toCommentResponse(saved);
    }

    public TicketCommentResponse editComment(String commentId, String content, String authorId) {
        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", commentId));
        if (!comment.getAuthor().getId().equals(authorId)) {
            throw new IllegalArgumentException("You can only edit your own comments");
        }
        comment.setContent(content);
        return toCommentResponse(commentRepository.save(comment));
    }

    public void deleteComment(String commentId, String authorId, boolean isAdmin) {
        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", commentId));
        if (!isAdmin && !comment.getAuthor().getId().equals(authorId)) {
            throw new IllegalArgumentException("You can only delete your own comments");
        }
        comment.setDeleted(true);
        commentRepository.save(comment);
    }

    public void deleteTicket(String ticketId, String userId) {
        IncidentTicket ticket = findTicketOrThrow(ticketId);
        // Only the reporter can delete their own ticket
        if (!ticket.getReporter().getId().equals(userId)) {
            throw new IllegalArgumentException("You can only delete your own incidents");
        }
        // User can only delete their ticket if it is still OPEN
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new IllegalStateException("Only OPEN tickets can be deleted");
        }
        // Delete attachments records first
        attachmentRepository.deleteAll(ticket.getAttachments());
        // Soft-delete: mark comments as deleted
        commentRepository.findByTicketIdAndDeletedFalseOrderByCreatedAtAsc(ticketId)
                .forEach(c -> { c.setDeleted(true); commentRepository.save(c); });
        // Hard-delete the ticket
        ticketRepository.delete(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketCommentResponse> getComments(String ticketId) {
        return commentRepository.findByTicketIdAndDeletedFalseOrderByCreatedAtAsc(ticketId)
                .stream().map(this::toCommentResponse).toList();
    }

    private IncidentTicket findTicketOrThrow(String ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("IncidentTicket", ticketId));
    }

    private TicketAttachment saveAttachment(MultipartFile file, IncidentTicket ticket) throws IOException {
        String secureUrl = cloudinaryService.uploadImage(file);

        String originalName = file.getOriginalFilename();

        TicketAttachment att = new TicketAttachment();
        att.setTicket(ticket);
        att.setFileName(originalName);
        att.setFilePath(secureUrl);
        att.setContentType(file.getContentType());
        att.setFileSize(file.getSize());
        return att;
    }

    private IncidentTicketResponse toResponse(IncidentTicket t) {
        // N+1 fix: We do NOT fetch comments here anymore. The frontend fetches comments
        // asynchronously when opening the TicketDetailPanel.
        List<String> attachmentUrls = t.getAttachments().stream()
                .map(TicketAttachment::getFilePath)
                .toList();
        
        // INNOVATION: Build attachment response objects with IDs and annotation data
        List<TicketAttachmentResponse> attachments = t.getAttachments().stream()
                .map(this::toAttachmentResponse)
                .toList();

        return new IncidentTicketResponse(
                t.getId(),
                t.getTitle(),
                t.getDescription(),
                t.getCategory(),
                t.getPriority().name(),
                t.getLocation(),
                t.getContactDetails(),
                t.getStatus().name(),
                t.getResolutionNotes(),
                t.getRejectionReason(),
                t.getReporter() != null ? t.getReporter().getId() : null,
                t.getReporter() != null ? (t.getReporter().getFullName() != null ? t.getReporter().getFullName() : t.getReporter().getUsername()) : "Unknown Reporter",
                t.getAssignee() != null ? t.getAssignee().getId() : null,
                t.getAssignee() != null ? (t.getAssignee().getFullName() != null ? t.getAssignee().getFullName() : t.getAssignee().getUsername()) : null,
                attachmentUrls,
                attachments,
                java.util.List.of(), // Empty list for comments to prevent N+1
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }

    private TicketCommentResponse toCommentResponse(TicketComment c) {
        return new TicketCommentResponse(
                c.getId(),
                c.getContent(),
                c.getAuthor().getId(),
                c.getAuthor().getFullName() != null ? c.getAuthor().getFullName() : c.getAuthor().getUsername(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }

    /**
     * INNOVATION: Save annotation data for an attachment
     * Allows users to mark/annotate evidence photos in incident reports
     * @param attachmentId ID of the attachment
     * @param annotationData JSON string with drawing/marking data from Fabric.js
     */
    @Transactional
    public TicketAttachmentResponse saveAnnotation(String attachmentId, String annotationData) {
        TicketAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
        
        attachment.setAnnotationData(annotationData);
        TicketAttachment saved = attachmentRepository.save(attachment);
        
        return toAttachmentResponse(saved);
    }

    /**
     * Get attachment with annotation data
     */
    @Transactional(readOnly = true)
    public TicketAttachmentResponse getAttachmentWithAnnotations(String attachmentId) {
        TicketAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
        return toAttachmentResponse(attachment);
    }

    /**
     * Convert TicketAttachment to response DTO
     */
    private TicketAttachmentResponse toAttachmentResponse(TicketAttachment att) {
        return new TicketAttachmentResponse(
                att.getId(),
                att.getFileName(),
                att.getFilePath(),
                att.getContentType(),
                att.getFileSize(),
                att.getAnnotationData(),
                att.getAnnotationData() != null && !att.getAnnotationData().isBlank()
        );
    }
}
