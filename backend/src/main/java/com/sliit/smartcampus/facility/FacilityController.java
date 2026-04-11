package com.sliit.smartcampus.facility;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/facilities")
public class FacilityController {
    private final FacilityService facilityService;

    public FacilityController(FacilityService facilityService) {
        this.facilityService = facilityService;
    }

    @GetMapping
    public org.springframework.http.ResponseEntity<List<FacilityResponse>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) Integer maxCapacity,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        FacilityFilter filter = new FacilityFilter(q, type, minCapacity, maxCapacity, location, status);
        return org.springframework.http.ResponseEntity.ok(facilityService.search(filter, sortBy, sortDir));
    }

    @GetMapping("/{id}")
    public org.springframework.http.ResponseEntity<FacilityResponse> getById(@PathVariable String id) {
        return org.springframework.http.ResponseEntity.ok(facilityService.getById(id));
    }

    @GetMapping("/metadata/types")
    public org.springframework.http.ResponseEntity<ResourceType[]> getTypes() {
        return org.springframework.http.ResponseEntity.ok(ResourceType.values());
    }

    @GetMapping("/metadata/statuses")
    public org.springframework.http.ResponseEntity<ResourceStatus[]> getStatuses() {
        return org.springframework.http.ResponseEntity.ok(ResourceStatus.values());
    }
}
