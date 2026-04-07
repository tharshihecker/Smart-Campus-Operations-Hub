import React, { useEffect, useState } from 'react';
import { fetchServices } from '../api';
import './PageBlocks.css';

function Services() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchServices()
      .then(data => {
        if (!mounted) return;
        setServices(data);
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err.message || 'Failed to load services');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="content-shell">
      <h2>Campus Services</h2>
      <p className="content-subtitle">Manage support channels and service requests quickly.</p>
      <div className="content-grid">
        {loading && <p className="state-text">Loading services...</p>}
        {error && <p className="state-text error">{error}</p>}
        {!loading && !error && services.length === 0 && <p className="state-text">No services available yet.</p>}
        {services.map(service => (
          <article className="content-card" key={service.id}>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <p className="content-meta">Status: {service.status}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Services;
