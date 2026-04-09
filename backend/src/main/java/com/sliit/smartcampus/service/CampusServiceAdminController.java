package com.sliit.smartcampus.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/services")
public class CampusServiceAdminController {
    private final CampusServiceRepository serviceRepository;

    public CampusServiceAdminController(CampusServiceRepository serviceRepository) {
        this.serviceRepository = serviceRepository;
    }

    @GetMapping
    public List<CampusServiceItem> getAll() {
        return serviceRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CampusServiceItem create(@RequestBody CampusServiceItem item) {
        return serviceRepository.save(item);
    }

    @PutMapping("/{id}")
    public CampusServiceItem update(@PathVariable String id, @RequestBody CampusServiceItem item) {
        CampusServiceItem existing = serviceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found"));
        existing.setTitle(item.getTitle());
        existing.setDescription(item.getDescription());
        existing.setStatus(item.getStatus());
        return serviceRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        if (!serviceRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found");
        }
        serviceRepository.deleteById(id);
    }
}
