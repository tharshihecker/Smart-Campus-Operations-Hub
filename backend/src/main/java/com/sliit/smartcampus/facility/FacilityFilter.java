package com.sliit.smartcampus.facility;

public record FacilityFilter(
        String keyword,
        ResourceType type,
        Integer minCapacity,
        Integer maxCapacity,
        String location,
        ResourceStatus status
) {
}
