package com.sliit.smartcampus.booking;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

public class QrCodeUtil {

    public static String buildBookingQrContent(Booking booking) {
        return String.format(
            "SMARTCAMPUS-BOOKING\nID: %s\nFacility: %s\nDate: %s\nTime: %s - %s\nUser: %s",
            booking.getId(),
            booking.getFacility().getName(),
            booking.getBookingDate(),
            booking.getStartTime(),
            booking.getEndTime(),
            booking.getUser().getUsername()
        );
    }

    public static byte[] generateQrPng(String content, int size) throws WriterException, IOException {
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            return baos.toByteArray();
        }
    }
}
