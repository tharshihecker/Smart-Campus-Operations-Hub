package com.sliit.smartcampus.notification;

import com.sliit.smartcampus.user.User;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    @DBRef
    private User user;

    private String title;

    private String message;

    private NotificationType type;

    private boolean isRead = false;

    // Reference to the related entity (booking ID or ticket ID)
    private String referenceId;

    private String referenceType; // "BOOKING" or "TICKET"

    @CreatedDate
    private LocalDateTime createdAt;
    // Getters and Setters
    public String getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean isRead) { this.isRead = isRead; }
    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }
    public String getReferenceType() { return referenceType; }
    public void setReferenceType(String referenceType) { this.referenceType = referenceType; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
