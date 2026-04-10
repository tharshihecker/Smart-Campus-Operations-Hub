package com.sliit.smartcampus.facility;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/facilities")
public class FacilityAdminController {
    private final FacilityService facilityService;

    public FacilityAdminController(FacilityService facilityService) {
        this.facilityService = facilityService;
    }

    @PostMapping
    public org.springframework.http.ResponseEntity<FacilityResponse> create(@Valid @RequestBody FacilityRequest request) {
        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(facilityService.create(request));
    }

    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<FacilityResponse> update(@PathVariable String id, @Valid @RequestBody FacilityRequest request) {
        return org.springframework.http.ResponseEntity.ok(facilityService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<Void> delete(@PathVariable String id) {
        facilityService.delete(id);
        return org.springframework.http.ResponseEntity.noContent().build();
    }
}
