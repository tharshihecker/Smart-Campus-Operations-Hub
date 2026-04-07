package com.sliit.smartcampus.event;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "campus_events")
public class CampusEvent {
    @Id
    private String id;

    private String title;

    private String description;

    private String eventDate;

    private String location;

    public CampusEvent() {
    }

    public CampusEvent(String title, String description, String eventDate, String location) {
        this.title = title;
        this.description = description;
        this.eventDate = eventDate;
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

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }
}
