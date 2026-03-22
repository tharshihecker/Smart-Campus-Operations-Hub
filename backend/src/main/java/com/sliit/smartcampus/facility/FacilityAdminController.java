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
    @ResponseStatus(HttpStatus.CREATED)
    public FacilityResponse create(@Valid @RequestBody FacilityRequest request) {
        return facilityService.create(request);
    }

    @PutMapping("/{id}")
    public FacilityResponse update(@PathVariable String id, @Valid @RequestBody FacilityRequest request) {
        return facilityService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        facilityService.delete(id);
    }
}
