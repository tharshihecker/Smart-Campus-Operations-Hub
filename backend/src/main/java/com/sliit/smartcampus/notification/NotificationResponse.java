package com.sliit.smartcampus.notification;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        String title,
        String message,
        String type,
        boolean read,
        Long referenceId,
        String referenceType,
        LocalDateTime createdAt
) {}
