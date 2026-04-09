package com.sliit.smartcampus.facility;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class FacilityService {
    private final FacilityRepository facilityRepository;
    private final MongoTemplate mongoTemplate;

    public FacilityService(FacilityRepository facilityRepository, MongoTemplate mongoTemplate) {
        this.facilityRepository = facilityRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public List<FacilityResponse> search(FacilityFilter filter, String sortBy, String sortDir) {
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        String safeSortField = allowedSortField(sortBy);
        Sort sort = Sort.by(direction, safeSortField);

        Query query = buildQuery(filter).with(sort);

        return mongoTemplate.find(query, Facility.class)
                .stream()
                .map(FacilityResponse::from)
                .toList();
    }

    public FacilityResponse getById(String id) {
        return facilityRepository.findById(id)
                .map(FacilityResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facility not found"));
    }

    public FacilityResponse create(FacilityRequest request) {
        validateAvailabilityWindow(request);
        Facility facility = new Facility();
        applyRequest(facility, request);
        return FacilityResponse.from(facilityRepository.save(facility));
    }

    public FacilityResponse update(String id, FacilityRequest request) {
        validateAvailabilityWindow(request);
        Facility facility = facilityRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facility not found"));
        applyRequest(facility, request);
        return FacilityResponse.from(facilityRepository.save(facility));
    }

    public void delete(String id) {
        if (!facilityRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Facility not found");
        }
        facilityRepository.deleteById(id);
    }

    private Query buildQuery(FacilityFilter filter) {
        Query query = new Query();

        if (filter.keyword() != null && !filter.keyword().isBlank()) {
            String keyword = filter.keyword().trim();
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("name").regex(keyword, "i"),
                    Criteria.where("description").regex(keyword, "i")
            ));
        }

        if (filter.type() != null) {
            query.addCriteria(Criteria.where("type").is(filter.type()));
        }

        if (filter.minCapacity() != null && filter.maxCapacity() != null) {
            query.addCriteria(Criteria.where("capacity").gte(filter.minCapacity()).lte(filter.maxCapacity()));
        } else if (filter.minCapacity() != null) {
            query.addCriteria(Criteria.where("capacity").gte(filter.minCapacity()));
        } else if (filter.maxCapacity() != null) {
            query.addCriteria(Criteria.where("capacity").lte(filter.maxCapacity()));
        }

        if (filter.location() != null && !filter.location().isBlank()) {
            String location = filter.location().trim();
            query.addCriteria(Criteria.where("location").regex(location, "i"));
        }

        if (filter.status() != null) {
            query.addCriteria(Criteria.where("status").is(filter.status()));
        }

        return query;
    }

    private String allowedSortField(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "name";
        }

        return switch (sortBy) {
            case "name", "capacity", "location", "type", "status" -> sortBy;
            default -> "name";
        };
    }

    private void applyRequest(Facility facility, FacilityRequest request) {
        facility.setName(request.getName().trim());
        facility.setType(request.getType());
        facility.setCapacity(request.getCapacity());
        facility.setLocation(request.getLocation().trim());
        facility.setAvailableFrom(request.getAvailableFrom());
        facility.setAvailableTo(request.getAvailableTo());
        facility.setStatus(request.getStatus());
        facility.setDescription(request.getDescription().trim());
    }

    private void validateAvailabilityWindow(FacilityRequest request) {
        if (!request.getAvailableFrom().isBefore(request.getAvailableTo())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "availableFrom must be before availableTo"
            );
        }
    }
}
