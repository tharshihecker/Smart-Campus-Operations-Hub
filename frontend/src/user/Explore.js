import React, { useEffect, useState } from 'react';
import { fetchEvents, fetchResources, fetchServices } from '../api';
import './PageBlocks.css';

function Explore() {
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [eventsData, resourcesData, servicesData] = await Promise.all([
          fetchEvents(),
          fetchResources(),
          fetchServices()
        ]);
        if (!mounted) return;
        setEvents(eventsData || []);
        setResources(resourcesData || []);
        setServices(servicesData || []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Tab styles
  const tabButtonStyle = (tab) => ({
    padding: '10px 20px',
    border: 'none',
    background: activeTab === tab ? 'var(--brand-teal)' : 'var(--bg-surface)',
    color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? 700 : 600,
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    borderBottom: activeTab === tab ? 'none' : '1px solid var(--border-medium)'
  });

  const tabContainerStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '0',
    borderBottom: '1px solid var(--border-medium)',
    flexWrap: 'wrap'
  };

  const tabContentStyle = {
    display: activeTab ? 'block' : 'none'
  };

  return (
    <section className="content-shell">
      <div style={{ marginBottom: '24px' }}>
        <h2>Explore Campus</h2>
        <p className="content-subtitle">Discover events, resources, and services available on campus.</p>
      </div>

      {/* Tab Navigation */}
      <div style={tabContainerStyle}>
        <button
          style={tabButtonStyle('events')}
          onClick={() => setActiveTab('events')}
        >
          📅 Events
        </button>
        <button
          style={tabButtonStyle('resources')}
          onClick={() => setActiveTab('resources')}
        >
          🎒 Resources
        </button>
        <button
          style={tabButtonStyle('services')}
          onClick={() => setActiveTab('services')}
        >
          🛠️ Services
        </button>
      </div>

      {/* Content Area */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '0 8px 8px 8px', padding: '24px', border: '1px solid var(--border-medium)', borderTop: 'none' }}>
        {error && <p className="state-text error">{error}</p>}
        {loading && <p className="state-text">Loading...</p>}

        {/* Events Tab */}
        {activeTab === 'events' && !loading && (
          <div>
            {events.length === 0 ? (
              <p className="state-text">No events available yet.</p>
            ) : (
              <div className="content-grid">
                {events.map(event => (
                  <article className="content-card" key={event.id}>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <p className="content-meta">
                      📅 {event.eventDate} | 📍 {event.location}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && !loading && (
          <div>
            {resources.length === 0 ? (
              <p className="state-text">No resources available yet.</p>
            ) : (
              <div className="content-grid">
                {resources.map(resource => (
                  <article className="content-card" key={resource.id}>
                    <h3>{resource.title}</h3>
                    <p>{resource.description}</p>
                    <p className="content-meta">📂 {resource.category}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && !loading && (
          <div>
            {services.length === 0 ? (
              <p className="state-text">No services available yet.</p>
            ) : (
              <div className="content-grid">
                {services.map(service => (
                  <article className="content-card" key={service.id}>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    <p className="content-meta">✅ Status: {service.status}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default Explore;
