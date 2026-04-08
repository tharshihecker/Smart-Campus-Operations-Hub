package com.sliit.smartcampus.incident;

import com.sliit.smartcampus.user.User;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

@Document(collection = "ticket_comments")
public class TicketComment {

    @Id
    private String id;

    @DBRef
    private IncidentTicket ticket;

    @DBRef
    private User author;

    @NotBlank
    private String content;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private boolean deleted = false;
    // Getters and Setters
    public String getId() { return id; }
    public IncidentTicket getTicket() { return ticket; }
    public void setTicket(IncidentTicket ticket) { this.ticket = ticket; }
    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
}
