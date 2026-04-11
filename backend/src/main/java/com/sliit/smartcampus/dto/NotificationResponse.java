package com.sliit.smartcampus.dto;

import java.time.LocalDateTime;
public record NotificationResponse(
        String id,
        String title,
        String message,
        String type,
        boolean read,
        String referenceId,
        String referenceType,
        LocalDateTime createdAt,
        String qrToken
) {}



