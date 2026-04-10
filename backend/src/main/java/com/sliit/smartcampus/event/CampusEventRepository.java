package com.sliit.smartcampus.event;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface CampusEventRepository extends MongoRepository<CampusEvent, String> {
}
