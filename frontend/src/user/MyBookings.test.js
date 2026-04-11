import { render, screen } from '@testing-library/react';
import MyBookings from './MyBookings';
import { fetchUserBookings, fetchUserWaitlist } from '../api';

// Mock the API module
jest.mock('../api');

describe('MyBookings Component', () => {
  beforeEach(() => {
    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'smartcampus_user_id') return 'user-123';
      return null;
    });

    // Default mock implementations
    fetchUserBookings.mockResolvedValue([]);
    fetchUserWaitlist.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders "My Bookings" title and subtitle', async () => {
    render(<MyBookings />);
    expect(screen.getByText('My Bookings')).toBeInTheDocument();
    expect(screen.getByText(/Manage your facility reservations and check booking status/i)).toBeInTheDocument();
  });

  test('does NOT render "Book a Facility" button', async () => {
    render(<MyBookings />);
    const bookBtn = screen.queryByText(/Book a Facility/i);
    expect(bookBtn).not.toBeInTheDocument();
  });

  test('renders "Manage Reservations" section', async () => {
    render(<MyBookings />);
    expect(screen.getByText(/Manage Reservations/i)).toBeInTheDocument();
  });

  test('loads and displays reservation data correctly', async () => {
    const mockBookings = [
      {
        id: '1',
        facilityName: 'Lab 1',
        status: 'APPROVED',
        bookingDate: '2026-04-10',
        startTime: '09:00',
        endTime: '10:00',
        purpose: 'Study',
        facilityLocation: 'Building A',
        createdAt: new Date().toISOString()
      }
    ];
    fetchUserBookings.mockResolvedValue(mockBookings);

    render(<MyBookings />);
    
    // Wait for the data to load
    const facilityName = await screen.findByText('Lab 1');
    expect(facilityName).toBeInTheDocument();
    
    // Check for the status badge specifically
    const statusBadges = screen.getAllByText('APPROVED');
    const badge = statusBadges.find(el => el.tagName === 'SPAN' && el.classList.contains('badge'));
    expect(badge).toBeInTheDocument();
  });
});
