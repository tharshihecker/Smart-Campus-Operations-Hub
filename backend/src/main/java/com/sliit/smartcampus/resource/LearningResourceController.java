package com.sliit.smartcampus.resource;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
public class LearningResourceController {
    private final LearningResourceRepository resourceRepository;

    public LearningResourceController(LearningResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
    }

    @GetMapping
    public List<LearningResource> getResources() {
        return resourceRepository.findAll();
    }
}
