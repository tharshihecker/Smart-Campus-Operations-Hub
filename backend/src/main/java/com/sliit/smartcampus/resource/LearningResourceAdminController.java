package com.sliit.smartcampus.resource;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/resources")
public class LearningResourceAdminController {
    private final LearningResourceRepository resourceRepository;

    public LearningResourceAdminController(LearningResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
    }

    @GetMapping
    public List<LearningResource> getAll() {
        return resourceRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LearningResource create(@RequestBody LearningResource resource) {
        return resourceRepository.save(resource);
    }

    @PutMapping("/{id}")
    public LearningResource update(@PathVariable String id, @RequestBody LearningResource resource) {
        LearningResource existing = resourceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found"));
        existing.setTitle(resource.getTitle());
        existing.setDescription(resource.getDescription());
        existing.setCategory(resource.getCategory());
        return resourceRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        if (!resourceRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found");
        }
        resourceRepository.deleteById(id);
    }
}
