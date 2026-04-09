package com.sliit.smartcampus.booking;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

public class IcsGenerator {
    private static final DateTimeFormatter ICS_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    public static byte[] generateIcs(Booking booking, String fromAddress) {
        LocalDateTime startObj = LocalDateTime.of(booking.getBookingDate(), booking.getStartTime());
        LocalDateTime endObj = LocalDateTime.of(booking.getBookingDate(), booking.getEndTime());
        
        String dtStart = startObj.atOffset(ZoneOffset.UTC).format(ICS_FORMAT);
        String dtEnd = endObj.atOffset(ZoneOffset.UTC).format(ICS_FORMAT);
        String dtStamp = LocalDateTime.now().atOffset(ZoneOffset.UTC).format(ICS_FORMAT);

        String title = booking.getFacility().getName() + " Booking";
        String summary = booking.getPurpose() != null ? booking.getPurpose().replace("\n", "\\n") : "Facility Booking";
        String location = booking.getFacility().getLocation() != null ? booking.getFacility().getLocation() : "Campus";
        String organizer = fromAddress != null ? fromAddress : "no-reply@smartcampus.local";

        String icsContent = 
                "BEGIN:VCALENDAR\r\n" +
                "VERSION:2.0\r\n" +
                "PRODID:-//Smart Campus//Booking System//EN\r\n" +
                "CALSCALE:GREGORIAN\r\n" +
                "METHOD:REQUEST\r\n" +
                "BEGIN:VEVENT\r\n" +
                "UID:" + booking.getId() + "@smartcampus.local\r\n" +
                "DTSTAMP:" + dtStamp + "\r\n" +
                "DTSTART:" + dtStart + "\r\n" +
                "DTEND:" + dtEnd + "\r\n" +
                "SUMMARY:" + title + "\r\n" +
                "DESCRIPTION:" + summary + "\r\n" +
                "LOCATION:" + location + "\r\n" +
                "ORGANIZER;CN=\"Smart Campus\":mailto:" + organizer + "\r\n" +
                "STATUS:CONFIRMED\r\n" +
                "END:VEVENT\r\n" +
                "END:VCALENDAR";

        return icsContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }
}
