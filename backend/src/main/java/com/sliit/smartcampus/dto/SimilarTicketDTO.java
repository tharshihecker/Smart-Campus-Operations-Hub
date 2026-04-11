package com.sliit.smartcampus.dto;

import java.time.LocalDateTime;
/**
 * DTO for returning similar ticket suggestions
 * Used by the duplicate detection feature to help users identify related incidents
 */
public record SimilarTicketDTO(
        String id,
        String title,
        String status,
        String priority,
        Double similarityScore,  // 0.0 to 1.0
        LocalDateTime createdAt
) {}



