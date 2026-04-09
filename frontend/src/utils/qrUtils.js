// QR Code URL Generator
// When scanning a QR code with token like: 88f233f8-e50e-4803-8a3d-118d6bb6c488
// It should redirect to: http://localhost:3000/admin/event-checkin?qr=88f233f8-e50e-4803-8a3d-118d6bb6c488

export function generateEventCheckInURL(qrToken) {
  const baseURL = window.location.origin;
  return `${baseURL}/admin/event-checkin?qr=${encodeURIComponent(qrToken)}`;
}

export function generateEventCheckInQRData(qrToken) {
  // For QR code generation, return the full URL
  return generateEventCheckInURL(qrToken);
}
