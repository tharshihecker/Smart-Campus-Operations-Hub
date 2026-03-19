package com.sliit.smartcampus.notification;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    private Long getCurrentUserId(Principal principal) {
        return (Long) ((UsernamePasswordAuthenticationToken) principal).getCredentials();
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(Principal principal) {
        Long userId = getCurrentUserId(principal);
        return ResponseEntity.ok(notificationService.getUserNotifications(userId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Principal principal) {
        Long userId = getCurrentUserId(principal);
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id, Principal principal) {
        Long userId = getCurrentUserId(principal);
        notificationService.markAsRead(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/mark-all-read")
    public ResponseEntity<Void> markAllRead(Principal principal) {
        Long userId = getCurrentUserId(principal);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id, Principal principal) {
        Long userId = getCurrentUserId(principal);
        notificationService.deleteNotification(id, userId);
        return ResponseEntity.noContent().build();
    }
}
