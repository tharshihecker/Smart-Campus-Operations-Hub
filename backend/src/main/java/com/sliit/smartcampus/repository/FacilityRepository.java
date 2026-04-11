package com.sliit.smartcampus.repository;

import com.sliit.smartcampus.model.Facility;

import org.springframework.data.mongodb.repository.MongoRepository;
public interface FacilityRepository extends MongoRepository<Facility, String> {
}



