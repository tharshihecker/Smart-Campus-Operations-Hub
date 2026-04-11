package com.sliit.smartcampus.controller;

import com.sliit.smartcampus.model.CampusEvent;
import com.sliit.smartcampus.service.CampusEventService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;
@RestController
@RequestMapping("/api/events")
public class CampusEventController {
    private final CampusEventService eventService;

    public CampusEventController(CampusEventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public List<CampusEvent> getEvents() {
        return eventService.getAllEvents();
    }

    @GetMapping("/{eventId}/availability")
    public Map<String, Object> getAvailability(@PathVariable String eventId) {
        return eventService.getAvailability(eventId);
    }
}



