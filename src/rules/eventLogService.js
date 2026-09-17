const events = [];

function logEvent(event) {
  const entry = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  events.push(entry);

  console.log("Event logged:", entry);

  return entry;
}

function getEvents() {
  return events;
}

module.exports = {
  logEvent,
  getEvents,
};