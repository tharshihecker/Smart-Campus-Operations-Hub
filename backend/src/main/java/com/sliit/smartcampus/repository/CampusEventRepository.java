package com.sliit.smartcampus.repository;

import com.sliit.smartcampus.model.CampusEvent;

import org.springframework.data.mongodb.repository.MongoRepository;
public interface CampusEventRepository extends MongoRepository<CampusEvent, String> {
}



