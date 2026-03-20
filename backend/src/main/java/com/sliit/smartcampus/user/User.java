package com.sliit.smartcampus.user;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String password; // nullable for OAuth-only accounts

    @Column(length = 120)
    private String fullName;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String department;

    @Column(length = 500)
    private String bio;

    @Column(length = 200)
    private String googleId;

    @Column(length = 30)
    private String oauthProvider; // "GOOGLE" or null for local

    // Notification preferences
    @Column(nullable = false)
    private boolean notifBookingUpdates = true;

    @Column(nullable = false)
    private boolean notifTicketUpdates = true;

    @Column(nullable = false)
    private boolean notifComments = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role = UserRole.USER;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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

