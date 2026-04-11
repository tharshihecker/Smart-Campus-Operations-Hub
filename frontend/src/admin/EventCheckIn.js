import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { scanEventBookingByToken, confirmEventCheckin } from '../api';
import './Admin.css';
import './ManageEvents.css';

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
    if (input.includes('event-checkin?qr=')) {
      const url = new URL(input);
      return url.searchParams.get('qr');
    }
    return input;
  };

  const handleScan = async (token) => {
    const scanToken = extractToken(token || qrToken.trim());
    if (!scanToken) {
      setError('Please enter a QR code');
      return;
    }

    setLoading(true); setError(''); setSuccess(''); setBookingDetails(null);

    try {
      const details = await scanEventBookingByToken(scanToken);
      setBookingDetails(details);
      if (details.error) setError(details.error);
    } catch (err) {
      setError(err.message || 'Failed to scan QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!bookingDetails || !qrToken) return;

    setConfirming(true); setError(''); setSuccess('');

    try {
      const token = extractToken(qrToken.trim());
      await confirmEventCheckin(token);
      setSuccess('✅ Attendee checked in successfully!');
      setBookingDetails({ ...bookingDetails, status: 'CHECKED_IN', checkedInAt: new Date().toISOString() });
    } catch (err) {
      setError(err.message || 'Failed to confirm check-in');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className="app-page ev-page">
      <div className="ev-header">
        <div className="ev-header-titles">
          <h2 className="ev-title">Event Check-In Terminal</h2>
          <p className="ev-subtitle">Verify QR tokens and register attendees instantly.</p>
        </div>
        <button className="ev-btn ev-btn-secondary" onClick={() => navigate('/admin/events')}>
          ← Back to Events
        </button>
      </div>

      <div className="ev-scanner-wrapper">
        <div className="ev-scanner-card">
          <div className="ev-scan-box">
            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f172a' }}>Scan QR Code Token</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.95rem' }}>Use your scanner gun or paste the manual token string below.</p>
            <div className="ev-scan-input-wrapper">
              <input
                className="ev-scan-input"
                type="text"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                placeholder="Paste token or URL here..."
                onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                disabled={loading}
              />
              <button className="ev-btn ev-btn-primary" onClick={() => handleScan()} disabled={loading || !qrToken.trim()} style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                {loading ? 'Scanning...' : '🔍 Scan'}
              </button>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 0 }}>❌ {error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 0 }}>{success}</div>}

          {bookingDetails && (
            <div className="ev-ticket">
              <div className="ev-ticket-header">
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{bookingDetails.eventTitle || 'Event Ticket'}</h3>
                <span className={`ev-ticket-status ${bookingDetails.status === 'CHECKED_IN' ? 'used' : (bookingDetails.status === 'CANCELLED' ? 'cancelled' : '')}`}>
                  {bookingDetails.status === 'CHECKED_IN' ? 'ALREADY USED' : bookingDetails.status}
                </span>
              </div>
              
              <div className="ev-ticket-body">
                <div>
                  <div className="ev-ticket-label">Attendee Name</div>
                  <div className="ev-ticket-val">{bookingDetails.attendeeName || 'N/A'}</div>
                </div>
                <div>
                  <div className="ev-ticket-label">Seat / Ticket #</div>
                  <div className="ev-ticket-val">{bookingDetails.seatNumber || bookingDetails.bookingNumber || 'General'}</div>
                </div>

                <div>
                  <div className="ev-ticket-label">Student ID</div>
                  <div className="ev-ticket-val">{bookingDetails.studentNumber || bookingDetails.nic || 'N/A'}</div>
                </div>
                <div>
                  <div className="ev-ticket-label">Date & Time</div>
                  <div className="ev-ticket-val">{bookingDetails.eventDate || 'N/A'} • {bookingDetails.eventStartTime || 'TBD'}</div>
                </div>
              </div>

              <div style={{ padding: '0 32px 32px' }}>
                {bookingDetails.warning && (
                  <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', borderRadius: '12px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
                    ⚠️ {bookingDetails.warning}
                  </div>
                )}

                {bookingDetails.status === 'CONFIRMED' && !bookingDetails.error && (
                  <button 
                    className="ev-btn ev-btn-primary" 
                    onClick={handleConfirm}
                    disabled={confirming}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '1.1rem', padding: '16px' }}
                  >
                    {confirming ? 'Confirming System...' : '✅ Approve Entry & Check-In'}
                  </button>
                )}
                
                {bookingDetails.status === 'CHECKED_IN' && (
                   <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fbbf24', fontWeight: 700 }}>
                     This ticket was stamped at {new Date(bookingDetails.checkedInAt).toLocaleString()}
                   </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default EventCheckIn;
