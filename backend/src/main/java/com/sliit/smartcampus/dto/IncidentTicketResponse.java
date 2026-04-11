package com.sliit.smartcampus.dto;

import java.time.LocalDateTime;
import java.util.List;
public record IncidentTicketResponse(
        String id,
        String title,
        String description,
        String category,
        String priority,
        String location,
        String contactDetails,
        String status,
        String resolutionNotes,
        String rejectionReason,
        String reporterId,
        String reporterName,
        String assigneeId,
        String assigneeName,
        List<String> attachmentUrls,
        List<TicketAttachmentResponse> attachments,
        List<TicketCommentResponse> comments,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}



