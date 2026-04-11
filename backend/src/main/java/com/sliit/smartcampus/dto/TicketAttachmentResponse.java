package com.sliit.smartcampus.dto;

/**
 * Response DTO for ticket attachments with annotation data
 * INNOVATION: Includes annotation metadata for photo marking feature
 */
public record TicketAttachmentResponse(
        String id,
        String fileName,
        String filePath,
        String contentType,
        Long fileSize,
        String annotationData,  // JSON string with drawing/marking data
        Boolean hasAnnotations  // Quick flag to check if image has marks
) {}



