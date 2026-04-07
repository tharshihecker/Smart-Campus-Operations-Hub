import React, { useEffect, useState } from 'react';
import { fetchResources } from '../api';
import './PageBlocks.css';

function Resources() {
  const [resources, setResources] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchResources()
      .then(data => {
        if (!mounted) return;
        setResources(data);
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err.message || 'Failed to load resources');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="content-shell">
      <h2>Learning Resources</h2>
      <p className="content-subtitle">Access infrastructure and digital tools that support academic performance.</p>
      <div className="content-grid">
        {loading && <p className="state-text">Loading resources...</p>}
        {error && <p className="state-text error">{error}</p>}
        {!loading && !error && resources.length === 0 && <p className="state-text">No resources available yet.</p>}
        {resources.map(resource => (
          <article className="content-card" key={resource.id}>
            <h3>{resource.title}</h3>
            <p>{resource.description}</p>
            <p className="content-meta">{resource.category}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Resources;
