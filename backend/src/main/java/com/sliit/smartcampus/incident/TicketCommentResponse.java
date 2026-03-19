package com.sliit.smartcampus.incident;

import java.time.LocalDateTime;

public record TicketCommentResponse(
        Long id,
        String content,
        Long authorId,
        String authorName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
