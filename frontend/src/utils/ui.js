export function sanitizeMessage(m) {
  if (!m) return '';
  try {
    // remove localhost or 127.0.0.1 references and ports
    return m.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    return String(m);
  }
}

export default { sanitizeMessage };
