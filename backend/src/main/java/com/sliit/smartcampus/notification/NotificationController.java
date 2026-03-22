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

    private String getCurrentUserId(Principal principal) {
        return (String) ((UsernamePasswordAuthenticationToken) principal).getCredentials();
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(Principal principal) {
        String userId = getCurrentUserId(principal);
        return ResponseEntity.ok(notificationService.getUserNotifications(userId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Principal principal) {
        String userId = getCurrentUserId(principal);
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable String id, Principal principal) {
        String userId = getCurrentUserId(principal);
        notificationService.markAsRead(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/mark-all-read")
    public ResponseEntity<Void> markAllRead(Principal principal) {
        String userId = getCurrentUserId(principal);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable String id, Principal principal) {
        String userId = getCurrentUserId(principal);
        notificationService.deleteNotification(id, userId);
        return ResponseEntity.noContent().build();
    }
}
