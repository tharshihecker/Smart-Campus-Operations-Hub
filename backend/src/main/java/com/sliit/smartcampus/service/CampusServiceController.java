package com.sliit.smartcampus.service;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/services")
public class CampusServiceController {
    private final CampusServiceRepository serviceRepository;

    public CampusServiceController(CampusServiceRepository serviceRepository) {
        this.serviceRepository = serviceRepository;
    }

    @GetMapping
    public List<CampusServiceItem> getServices() {
        return serviceRepository.findAll();
    }
}
