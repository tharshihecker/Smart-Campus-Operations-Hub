package com.sliit.smartcampus.event;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class CampusEventController {
    private final CampusEventRepository eventRepository;

    public CampusEventController(CampusEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @GetMapping
    public List<CampusEvent> getEvents() {
        return eventRepository.findAll();
    }
}
