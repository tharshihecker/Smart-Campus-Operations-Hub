package com.sliit.smartcampus.service;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface CampusServiceRepository extends MongoRepository<CampusServiceItem, String> {
    long countByStatusIgnoreCase(String status);
}
