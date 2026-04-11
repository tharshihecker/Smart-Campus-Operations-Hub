package com.sliit.smartcampus.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
@Document(collection = "campus_events")
public class CampusEvent {
    @Id
    private String id;

    private String title;

    private String description;
    
    private String eventDate;

    private String bookingCloseDate; // date string YYYY-MM-DD

    private String startTime; // time string HH:mm

    private String endTime; // time string HH:mm

    private Integer capacity; // total seats for event

    private String imageUrl;

    private String location;

    public CampusEvent() {
    }

    // Backwards-compatible constructor used by data initializer and older callers
    public CampusEvent(String title, String description, String eventDate, String location) {
        this.title = title;
        this.description = description;
        this.eventDate = eventDate;
        this.location = location;
    }

    public CampusEvent(String title, String description, String eventDate, String bookingCloseDate,
                       String startTime, String endTime, Integer capacity, String imageUrl, String location) {
        this.title = title;
        this.description = description;
        this.eventDate = eventDate;
        this.bookingCloseDate = bookingCloseDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.capacity = capacity;
        this.imageUrl = imageUrl;
        this.location = location;
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getEventDate() {
        return eventDate;
    }

    public void setEventDate(String eventDate) {
        this.eventDate = eventDate;
    }

    public String getBookingCloseDate() {
        return bookingCloseDate;
    }

    public void setBookingCloseDate(String bookingCloseDate) {
        this.bookingCloseDate = bookingCloseDate;
    }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }
}



