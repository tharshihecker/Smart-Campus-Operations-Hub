package com.sliit.smartcampus.booking;

import com.sliit.smartcampus.facility.Facility;
import com.sliit.smartcampus.facility.FacilityRepository;
import com.sliit.smartcampus.facility.ResourceStatus;
import com.sliit.smartcampus.facility.ResourceType;
import com.sliit.smartcampus.notification.NotificationService;
import com.sliit.smartcampus.user.User;
import com.sliit.smartcampus.user.UserRepository;
import com.sliit.smartcampus.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BookingServiceTest {

    @Autowired BookingService bookingService;
    @Autowired BookingRepository bookingRepository;
    @Autowired FacilityRepository facilityRepository;
    @Autowired UserRepository userRepository;

    private Facility testFacility;
    private User testUser;

    @BeforeEach
    void setup() {
        testFacility = new Facility();
        testFacility.setName("Test Hall");
        testFacility.setType(ResourceType.LECTURE_HALL);
        testFacility.setCapacity(100);
        testFacility.setLocation("Block A");
        testFacility.setAvailableFrom(LocalTime.of(8, 0));
        testFacility.setAvailableTo(LocalTime.of(18, 0));
        testFacility.setStatus(ResourceStatus.ACTIVE);
        testFacility.setDescription("Test facility");
        testFacility = facilityRepository.save(testFacility);

        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@test.com");
        testUser.setPassword("password");
        testUser.setRole(UserRole.USER);
        testUser.setEnabled(true);
        testUser = userRepository.save(testUser);
    }

    @Test
    void createBooking_Success() {
        BookingRequest req = buildRequest(LocalDate.now().plusDays(1),
                LocalTime.of(9, 0), LocalTime.of(10, 0));
        BookingResponse response = bookingService.createBooking(req);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.facilityName()).isEqualTo("Test Hall");
    }

    @Test
    void createBooking_ConflictDetection() {
        BookingRequest req1 = buildRequest(LocalDate.now().plusDays(1),
                LocalTime.of(9, 0), LocalTime.of(11, 0));
        bookingService.createBooking(req1);

        BookingRequest req2 = buildRequest(LocalDate.now().plusDays(1),
                LocalTime.of(10, 0), LocalTime.of(12, 0));

        assertThatThrownBy(() -> bookingService.createBooking(req2))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("conflicts");
    }

    @Test
    void createBooking_PastDate_ThrowsException() {
        BookingRequest req = buildRequest(LocalDate.now().minusDays(1),
                LocalTime.of(9, 0), LocalTime.of(10, 0));
        assertThatThrownBy(() -> bookingService.createBooking(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("past date");
    }

    @Test
    void createBooking_ExceedsCapacity_ThrowsException() {
        BookingRequest req = buildRequest(LocalDate.now().plusDays(1),
                LocalTime.of(9, 0), LocalTime.of(10, 0));
        req.setAttendeeCount(999);

        assertThatThrownBy(() -> bookingService.createBooking(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("capacity");
    }

    @Test
    void cancelBooking_ByOwner_Success() {
        BookingRequest req = buildRequest(LocalDate.now().plusDays(1),
                LocalTime.of(9, 0), LocalTime.of(10, 0));
        BookingResponse created = bookingService.createBooking(req);

        BookingResponse cancelled = bookingService.cancelBooking(created.id(), testUser.getId());
        assertThat(cancelled.status()).isEqualTo("CANCELLED");
    }

    @Test
    void cancelBooking_ByWrongUser_Forbidden() {
        BookingRequest req = buildRequest(LocalDate.now().plusDays(1),
                LocalTime.of(9, 0), LocalTime.of(10, 0));
        BookingResponse created = bookingService.createBooking(req);

        assertThatThrownBy(() -> bookingService.cancelBooking(created.id(), 99999L))
                .isInstanceOf(ResponseStatusException.class);
    }

    private BookingRequest buildRequest(LocalDate date, LocalTime start, LocalTime end) {
        BookingRequest req = new BookingRequest();
        req.setFacilityId(testFacility.getId());
        req.setUserId(testUser.getId());
        req.setBookingDate(date);
        req.setStartTime(start);
        req.setEndTime(end);
        req.setPurpose("Unit test booking");
        req.setAttendeeCount(10);
        return req;
    }
}
