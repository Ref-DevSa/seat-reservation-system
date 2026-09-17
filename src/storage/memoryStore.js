const settings = require("../config/settings");

const seats = new Map();

for (let seatNumber = 1; seatNumber <= settings.seatsPerEvent; seatNumber++) {
  seats.set(seatNumber, {
    seatNumber,
    status: "Available",
    email: null,
    holdCode: null,
    heldAt: null,
    expiresAt: null,
    extensionCount: 0
  });
}

const holds = new Map();

const hourlyHistory = new Map();

const waitlist = [];

const eventLog = [];

module.exports = {
  seats,
  holds,
  hourlyHistory,
  waitlist,
  eventLog
};