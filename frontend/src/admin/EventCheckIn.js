import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { scanEventBookingByToken, confirmEventCheckin } from '../api';
import './Admin.css';

function EventCheckIn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [qrToken, setQrToken] = useState('');
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const token = searchParams.get('qr');
    if (token) {
      setQrToken(token);
      handleScan(token);
    }
  }, [searchParams]);

  const extractToken = (input) => {
    // If input is a full URL, extract the token from query parameter
    if (input.includes('event-checkin?qr=')) {
      const url = new URL(input);
      return url.searchParams.get('qr');
    }
    // Otherwise, it's just the token
    return input;
  };

  const handleScan = async (token) => {
    const scanToken = extractToken(token || qrToken.trim());
    if (!scanToken) {
      setError('Please enter a QR code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setBookingDetails(null);

    try {
      const details = await scanEventBookingByToken(scanToken);
      setBookingDetails(details);
      if (details.error) {
        setError(details.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to scan QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!bookingDetails || !qrToken) return;

    setConfirming(true);
    setError('');
    setSuccess('');

    try {
      const token = extractToken(qrToken.trim());
      await confirmEventCheckin(token);
      setSuccess('✅ Check-in confirmed successfully!');
      // Update local state
      setBookingDetails({ 
        ...bookingDetails, 
        status: 'CHECKED_IN', 
        checkedInAt: new Date().toISOString() 
      });
    } catch (err) {
      setError(err.message || 'Failed to confirm check-in');
    } finally {
      setConfirming(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      CONFIRMED: { label: 'Confirmed', className: 'badge-approved' },
      CHECKED_IN: { label: 'Checked In', className: 'badge-completed' },
      WAITLISTED: { label: 'Waitlisted', className: 'badge-pending' },
      CANCELLED: { label: 'Cancelled', className: 'badge-cancelled' }
    };
    const badge = badges[status] || { label: status, className: 'badge-pending' };
    return <span className={`badge ${badge.className}`}>{badge.label}</span>;
  };

  return (
    <section className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Event Check-In</h2>
          <p className="admin-subtitle">Scan QR codes to verify and check-in event attendees</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/admin/events')}>
          ← Back to Events
        </button>
      </div>

      <div className="admin-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Enter QR Code Token:
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="Paste QR code or URL here"
              onKeyPress={(e) => e.key === 'Enter' && handleScan()}
              disabled={loading}
              style={{ flex: 1, padding: '12px', fontSize: '0.95rem' }}
            />
            <button 
              className="btn-primary" 
              onClick={() => handleScan()}
              disabled={loading || !qrToken.trim()}
            >
              {loading ? 'Scanning...' : '🔍 Scan'}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            {success}
          </div>
        )}

        {bookingDetails && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>📋 Booking Details</h3>
              {getStatusBadge(bookingDetails.status)}
            </div>

            {/* Event Information */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#4b5563' }}>🎉 Event Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Event:</span>
                  <span className="detail-value">{bookingDetails.eventTitle || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{bookingDetails.eventDate || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Time:</span>
                  <span className="detail-value">
                    {bookingDetails.eventStartTime && bookingDetails.eventEndTime 
                      ? `${bookingDetails.eventStartTime} - ${bookingDetails.eventEndTime}`
                      : 'N/A'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{bookingDetails.eventLocation || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Attendee Information */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#4b5563' }}>👤 Attendee Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{bookingDetails.attendeeName || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{bookingDetails.attendeeEmail || 'N/A'}</span>
                </div>
                {bookingDetails.studentNumber && (
                  <div className="detail-item">
                    <span className="detail-label">Student #:</span>
                    <span className="detail-value">{bookingDetails.studentNumber}</span>
                  </div>
                )}
                {bookingDetails.nic && (
                  <div className="detail-item">
                    <span className="detail-label">NIC:</span>
                    <span className="detail-value">{bookingDetails.nic}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Information */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#4b5563' }}>🎫 Booking Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Booking #:</span>
                  <span className="detail-value">{bookingDetails.bookingNumber || 'N/A'}</span>
                </div>
                {bookingDetails.seatNumber && (
                  <div className="detail-item">
                    <span className="detail-label">Seat #:</span>
                    <span className="detail-value">{bookingDetails.seatNumber}</span>
                  </div>
                )}
                {bookingDetails.checkedInAt && (
                  <div className="detail-item">
                    <span className="detail-label">Checked In:</span>
                    <span className="detail-value">{new Date(bookingDetails.checkedInAt).toLocaleString()}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">Booked At:</span>
                  <span className="detail-value">
                    {bookingDetails.createdAt ? new Date(bookingDetails.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning/Error Messages */}
            {bookingDetails.warning && (
              <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                ⚠️ {bookingDetails.warning}
              </div>
            )}

            {/* Confirm Button */}
            {bookingDetails.status === 'CONFIRMED' && !bookingDetails.error && (
              <button 
                className="btn-approve" 
                onClick={handleConfirm}
                disabled={confirming}
                style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
              >
                {confirming ? 'Confirming...' : '✅ Confirm Check-In'}
              </button>
            )}

            {bookingDetails.status === 'CHECKED_IN' && (
              <div style={{ textAlign: 'center', padding: '16px', background: '#d1fae5', borderRadius: '8px', color: '#065f46' }}>
                <strong>✅ This attendee has already been checked in</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default EventCheckIn;
