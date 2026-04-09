package com.sliit.smartcampus.incident;

import java.time.LocalDateTime;

public record TicketCommentResponse(
        String id,
        String content,
        String authorId,
        String authorName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
