package com.sliit.smartcampus.dto;

import com.sliit.smartcampus.model.ResourceStatus;
import com.sliit.smartcampus.model.ResourceType;

public record FacilityFilter(
        String keyword,
        ResourceType type,
        Integer minCapacity,
        Integer maxCapacity,
        String location,
        ResourceStatus status
) {
}



