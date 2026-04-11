package com.sliit.smartcampus.repository;

import com.sliit.smartcampus.model.CampusServiceItem;

import org.springframework.data.mongodb.repository.MongoRepository;
public interface CampusServiceRepository extends MongoRepository<CampusServiceItem, String> {
    long countByStatusIgnoreCase(String status);
}



