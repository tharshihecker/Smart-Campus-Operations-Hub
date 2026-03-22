package com.sliit.smartcampus.event;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/events")
public class CampusEventAdminController {
    private final CampusEventRepository eventRepository;

    public CampusEventAdminController(CampusEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @GetMapping
    public List<CampusEvent> getAll() {
        return eventRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CampusEvent create(@RequestBody CampusEvent event) {
        return eventRepository.save(event);
    }

    @PutMapping("/{id}")
    public CampusEvent update(@PathVariable String id, @RequestBody CampusEvent event) {
        CampusEvent existing = eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        existing.setTitle(event.getTitle());
        existing.setDescription(event.getDescription());
        existing.setEventDate(event.getEventDate());
        existing.setLocation(event.getLocation());
        return eventRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        if (!eventRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }
        eventRepository.deleteById(id);
    }
}
