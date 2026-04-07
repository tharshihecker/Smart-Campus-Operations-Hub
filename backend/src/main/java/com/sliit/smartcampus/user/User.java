package com.sliit.smartcampus.user;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.time.LocalDateTime;

@Document(collection = "users")
public class User {
    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    private String password; // nullable for OAuth-only accounts

    private String fullName;

    private String phone;

    private String department;

    private String bio;

    private String googleId;

    private String oauthProvider; // "GOOGLE" or null for local

    // Notification preferences
    private boolean notifBookingUpdates = true;

    private boolean notifTicketUpdates = true;

    private boolean notifComments = true;

    private UserRole role = UserRole.USER;

    private boolean enabled = true;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public void setCreatedAt() {
        if(createdAt == null) createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    public void setUpdatedAt() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }
    public String getOauthProvider() { return oauthProvider; }
    public void setOauthProvider(String oauthProvider) { this.oauthProvider = oauthProvider; }
    public boolean isNotifBookingUpdates() { return notifBookingUpdates; }
    public void setNotifBookingUpdates(boolean notifBookingUpdates) { this.notifBookingUpdates = notifBookingUpdates; }
    public boolean isNotifTicketUpdates() { return notifTicketUpdates; }
    public void setNotifTicketUpdates(boolean notifTicketUpdates) { this.notifTicketUpdates = notifTicketUpdates; }
    public boolean isNotifComments() { return notifComments; }
    public void setNotifComments(boolean notifComments) { this.notifComments = notifComments; }
    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

