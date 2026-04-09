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
    private final CampusEventRepository eventRepository;
    private final CloudinaryService cloudinaryService;

    public CampusEventAdminController(CampusEventRepository eventRepository, CloudinaryService cloudinaryService) {
        this.eventRepository = eventRepository;
        this.cloudinaryService = cloudinaryService;
    }

    @GetMapping
    public List<CampusEvent> getAll() {
        return eventRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CampusEvent create(@RequestBody CampusEvent event) {
        validateEventDatesAndCapacity(event);
        return eventRepository.save(event);
    }

    @PutMapping("/{id}")
    public CampusEvent update(@PathVariable String id, @RequestBody CampusEvent event) {
        CampusEvent existing = eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        existing.setTitle(event.getTitle());
        existing.setDescription(event.getDescription());
        existing.setEventDate(event.getEventDate());
        existing.setBookingCloseDate(event.getBookingCloseDate());
        existing.setStartTime(event.getStartTime());
        existing.setEndTime(event.getEndTime());
        existing.setCapacity(event.getCapacity());
        existing.setImageUrl(event.getImageUrl());
        existing.setLocation(event.getLocation());
        validateEventDatesAndCapacity(existing);
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

    private void validateEventDatesAndCapacity(CampusEvent event) {
        if (event.getEventDate() != null && event.getBookingCloseDate() != null
                && !event.getBookingCloseDate().isBlank() && !event.getEventDate().isBlank()) {
            try {
                LocalDate ev = LocalDate.parse(event.getEventDate());
                LocalDate close = LocalDate.parse(event.getBookingCloseDate());
                if (!close.isBefore(ev)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking close date must be before event start date");
                }
            } catch (DateTimeParseException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format (expected YYYY-MM-DD)");
            }
        }
        if (event.getCapacity() != null && event.getCapacity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Capacity cannot be negative");
        }
    }
}
