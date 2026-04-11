package com.sliit.smartcampus.dto;

import com.sliit.smartcampus.model.Facility;
import com.sliit.smartcampus.model.ResourceStatus;
import com.sliit.smartcampus.model.ResourceType;

import java.time.LocalTime;
public record FacilityResponse(
        String id,
        String name,
        ResourceType type,
        Integer capacity,
        String location,
        LocalTime availableFrom,
        LocalTime availableTo,
        ResourceStatus status,
        String description
) {
    public static FacilityResponse from(Facility facility) {
        return new FacilityResponse(
                facility.getId(),
                facility.getName(),
                facility.getType(),
                facility.getCapacity(),
                facility.getLocation(),
                facility.getAvailableFrom(),
                facility.getAvailableTo(),
                facility.getStatus(),
                facility.getDescription()
        );
    }
}



