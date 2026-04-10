package com.sliit.smartcampus.event;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestPart;
import com.sliit.smartcampus.service.CloudinaryService;
import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/events")
public class CampusEventAdminController {
    private final CampusEventService eventService;
    private final CloudinaryService cloudinaryService;

    public CampusEventAdminController(CampusEventService eventService, CloudinaryService cloudinaryService) {
        this.eventService = eventService;
        this.cloudinaryService = cloudinaryService;
    }

    @GetMapping
    public List<CampusEvent> getAll() {
        return eventService.getAllEvents();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CampusEvent create(@RequestBody CampusEvent event) {
        return eventService.createEvent(event);
    }

    @PutMapping("/{id}")
    public CampusEvent update(@PathVariable String id, @RequestBody CampusEvent event) {
        return eventService.updateEvent(id, event);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        eventService.deleteEvent(id);
    }

    @PostMapping(path = "/upload-image", consumes = {"multipart/form-data"})
    public Map<String, String> uploadImage(@RequestPart("file") MultipartFile file) {
        if (cloudinaryService == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image upload not configured");
        }
        try {
            String url = cloudinaryService.uploadImage(file);
            return Map.of("url", url);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Image upload failed");
        }
    }

}
