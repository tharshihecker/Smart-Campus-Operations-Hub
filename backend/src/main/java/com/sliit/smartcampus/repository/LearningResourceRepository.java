package com.sliit.smartcampus.repository;

import com.sliit.smartcampus.model.LearningResource;

import org.springframework.data.mongodb.repository.MongoRepository;
public interface LearningResourceRepository extends MongoRepository<LearningResource, String> {
}



