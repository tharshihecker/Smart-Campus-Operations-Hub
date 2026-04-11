package com.sliit.smartcampus.resource;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface LearningResourceRepository extends MongoRepository<LearningResource, String> {
}
