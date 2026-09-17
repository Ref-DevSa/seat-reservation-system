const { eventLog } = require("../storage/memoryStore");

function addEvent({
  type,
  seatNumber = null,
  email = null,
  holdCode = null
}) {
  const event = {
    type,
    timestamp: new Date().toISOString(),
    seatNumber,
    email,
    holdCode
  };

  eventLog.push(event);

  return event;
}

function getEventLog() {
  return [...eventLog];
}

module.exports = {
  addEvent,
  getEventLog
};