import React, { useState } from 'react';
import { scanEventBookingByToken, confirmEventCheckin, isAdmin } from '../api';
import './QRScanner.css';

function QRScanner({ onClose }) {
  const [qrToken, setQrToken] = useState('');
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const adminMode = isAdmin();

  const handleScan = async () => {
    if (!qrToken.trim()) {
      setError('Please enter a QR code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setBookingDetails(null);

    try {
      const details = await scanEventBookingByToken(qrToken.trim());
      setBookingDetails(details);
    } catch (err) {
      setError(err.message || 'Failed to scan QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!bookingDetails) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await confirmEventCheckin(qrToken.trim());
      setSuccess('✅ Check-in confirmed successfully!');
      setBookingDetails({ ...bookingDetails, status: 'CHECKED_IN', checkedInAt: new Date().toISOString() });
    } catch (err) {
      setError(err.message || 'Failed to confirm check-in');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      CONFIRMED: { label: 'Confirmed', color: '#10b981' },
      CHECKED_IN: { label: 'Checked In', color: '#3b82f6' },
      WAITLISTED: { label: 'Waitlisted', color: '#f59e0b' },
      CANCELLED: { label: 'Cancelled', color: '#ef4444' }
    };
    const badge = badges[status] || { label: status, color: '#6b7280' };
    return <span className="status-badge" style={{ backgroundColor: badge.color }}>{badge.label}</span>;
  };

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-modal">
        <div className="qr-scanner-header">
          <h3>📱 Scan Event QR Code</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="qr-scanner-body">
          <div className="qr-input-section">
            <label>Enter QR Code Token:</label>
            <input
              type="text"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="e.g., f00703dd-0f07-45a0-9e35-286300fc71a9"
              onKeyPress={(e) => e.key === 'Enter' && handleScan()}
              disabled={loading}
            />
            <button 
              className="btn-scan" 
              onClick={handleScan}
              disabled={loading || !qrToken.trim()}
            >
              {loading ? 'Scanning...' : '🔍 Scan'}
            </button>
          </div>

          {error && (
            <div className="alert alert-error">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          {bookingDetails && (
            <div className="booking-details-card">
              <div className="detail-header">
                <h4>📋 Booking Details</h4>
                {getStatusBadge(bookingDetails.status)}
              </div>

              <div className="detail-section">
                <h5>🎉 Event Information</h5>
                <div className="detail-row">
                  <span className="label">Event:</span>
                  <span className="value">{bookingDetails.eventTitle || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">{bookingDetails.eventDate || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Time:</span>
                  <span className="value">
                    {bookingDetails.eventStartTime && bookingDetails.eventEndTime 
                      ? `${bookingDetails.eventStartTime} - ${bookingDetails.eventEndTime}`
                      : 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Location:</span>
                  <span className="value">{bookingDetails.eventLocation || 'N/A'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h5>👤 Attendee Information</h5>
                <div className="detail-row">
                  <span className="label">Name:</span>
                  <span className="value">{bookingDetails.attendeeName || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span className="value">{bookingDetails.attendeeEmail || 'N/A'}</span>
                </div>
                {bookingDetails.studentNumber && (
                  <div className="detail-row">
                    <span className="label">Student #:</span>
                    <span className="value">{bookingDetails.studentNumber}</span>
                  </div>
                )}
                {bookingDetails.nic && (
                  <div className="detail-row">
                    <span className="label">NIC:</span>
                    <span className="value">{bookingDetails.nic}</span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h5>🎫 Booking Information</h5>
                <div className="detail-row">
                  <span className="label">Booking #:</span>
                  <span className="value">{bookingDetails.bookingNumber || 'N/A'}</span>
                </div>
                {bookingDetails.seatNumber && (
                  <div className="detail-row">
                    <span className="label">Seat #:</span>
                    <span className="value">{bookingDetails.seatNumber}</span>
                  </div>
                )}
                {bookingDetails.checkedInAt && (
                  <div className="detail-row">
                    <span className="label">Checked In:</span>
                    <span className="value">{new Date(bookingDetails.checkedInAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {bookingDetails.error && (
                <div className="alert alert-error">
                  ❌ {bookingDetails.error}
                </div>
              )}

              {bookingDetails.warning && (
                <div className="alert alert-warning">
                  ⚠️ {bookingDetails.warning}
                </div>
              )}

              {adminMode && bookingDetails.status === 'CONFIRMED' && !bookingDetails.error && (
                <button 
                  className="btn-confirm" 
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading ? 'Confirming...' : '✅ Confirm Check-In'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QRScanner;
