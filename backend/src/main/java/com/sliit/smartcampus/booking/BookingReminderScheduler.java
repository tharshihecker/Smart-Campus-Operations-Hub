package com.sliit.smartcampus.booking;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class BookingReminderScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(BookingReminderScheduler.class);

    private final BookingService bookingService;

    public BookingReminderScheduler(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @Scheduled(cron = "${app.booking-reminder.cron:0 */30 * * * *}")
    public void sendUpcomingBookingReminders() {
        int sent = bookingService.processUpcomingBookingReminders();
        if (sent > 0) {
            LOGGER.info("Sent {} booking reminder email(s)", sent);
        }
    }
}
