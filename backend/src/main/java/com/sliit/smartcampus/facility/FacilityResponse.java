package com.sliit.smartcampus.facility;

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
