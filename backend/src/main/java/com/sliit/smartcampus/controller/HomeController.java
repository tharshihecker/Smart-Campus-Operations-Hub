package com.sliit.smartcampus.controller;

import com.sliit.smartcampus.model.BookingStatus;
import com.sliit.smartcampus.repository.BookingRepository;
import com.sliit.smartcampus.repository.CampusEventRepository;
import com.sliit.smartcampus.repository.CampusServiceRepository;
import com.sliit.smartcampus.repository.FacilityRepository;
import com.sliit.smartcampus.repository.LearningResourceRepository;
import com.sliit.smartcampus.repository.UserRepository;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
@RestController
@RequestMapping("/api/home")
public class HomeController {
    private final CampusEventRepository eventRepository;
    private final LearningResourceRepository resourceRepository;
    private final CampusServiceRepository serviceRepository;
    private final FacilityRepository facilityRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    public HomeController(
            CampusEventRepository eventRepository,
            LearningResourceRepository resourceRepository,
            CampusServiceRepository serviceRepository,
            FacilityRepository facilityRepository,
            UserRepository userRepository,
            BookingRepository bookingRepository
    ) {
        this.eventRepository = eventRepository;
        this.resourceRepository = resourceRepository;
        this.serviceRepository = serviceRepository;
        this.facilityRepository = facilityRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
    }

    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        long totalEvents = eventRepository.count();
        long totalResources = resourceRepository.count();
        long totalServices = serviceRepository.count();
        long activeServices = serviceRepository.countByStatusIgnoreCase("active");
        long totalFacilities = facilityRepository.count();
        long totalUsers = userRepository.count();
        long totalBookings = bookingRepository.count();
        long pendingBookings = bookingRepository.countByStatus(BookingStatus.PENDING);
        long approvedBookings = bookingRepository.countByStatus(BookingStatus.APPROVED);

        return Map.of(
                "totalEvents", totalEvents,
                "totalResources", totalResources,
                "totalServices", totalServices,
                "activeServices", activeServices,
                "totalFacilities", totalFacilities,
                "totalUsers", totalUsers,
                "totalBookings", totalBookings,
                "pendingBookings", pendingBookings,
                "approvedBookings", approvedBookings
        );
    }
}



