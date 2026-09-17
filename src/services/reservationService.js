const settings = require("../config/settings");
const {
  seats,
  holds,
  hourlyHistory,
  waitlist
} = require("../storage/memoryStore");
const { generateHoldCode } = require("../utils/holdCode");
const { addEvent } = require("./eventLogService");

function getUserActiveHolds(email) {
  let count = 0;

  for (const hold of holds.values()) {
    if (
      hold.email === email &&
      (hold.status === "Held" || hold.status === "Confirmed")
    ) {
      if (hold.status === "Held") {
        count++;
      }
    }
  }

  return count;
}

function getUserHourlyHistory(email, now) {
  const history = hourlyHistory.get(email) || [];

  const oneHourAgo = now.getTime() - 60 * 60 * 1000;

  return history.filter(
    (timestamp) => new Date(timestamp).getTime() >= oneHourAgo
  );
}

function createUniqueHoldCode() {
  let code;

  do {
    code = generateHoldCode();
  } while (holds.has(code));

  return code;
}

function placeHold(email, seatNumber) {
  const now = new Date();

  if (!Number.isInteger(seatNumber)) {
    return {
      success: false,
      reason: "invalid_seat_number"
    };
  }

  const seat = seats.get(seatNumber);

  if (!seat) {
    return {
      success: false,
      reason: "invalid_seat_number"
    };
  }

  if (seat.status !== "Available") {
    return {
      success: false,
      reason: "seat_not_available"
    };
  }

  if (getUserActiveHolds(email) >= settings.maximumActiveHoldsPerUser) {
    return {
      success: false,
      reason: "maximum_active_holds_reached"
    };
  }

  const recentHistory = getUserHourlyHistory(email, now);

  if (recentHistory.length >= settings.maximumHoldsPerUserPerHour) {
    return {
      success: false,
      reason: "maximum_hourly_holds_reached"
    };
  }

  const holdCode = createUniqueHoldCode();

  const expiresAt = new Date(
    now.getTime() + settings.holdExpirySeconds * 1000
  );

  const hold = {
    holdCode,
    seatNumber,
    email,
    status: "Held",
    placedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    extensionCount: 0
  };

  seat.status = "Held";
  seat.email = email;
  seat.holdCode = holdCode;
  seat.heldAt = now.toISOString();
  seat.expiresAt = expiresAt.toISOString();
  seat.extensionCount = 0;

  holds.set(holdCode, hold);

  if (!hourlyHistory.has(email)) {
    hourlyHistory.set(email, []);
  }

  hourlyHistory.get(email).push(now.toISOString());

  addEvent({
    type: "hold placed",
    seatNumber,
    email,
    holdCode
  });

  return {
    success: true,
    seatNumber,
    holdCode,
    expiresAt: expiresAt.toISOString()
  };
}

function extendHold(email, holdCode) {
  const hold = holds.get(holdCode);

  if (!hold || hold.email !== email) {
    return {
      success: false,
      reason: "hold_not_found"
    };
  }

  if (hold.status !== "Held") {
    return {
      success: false,
      reason: "hold_not_active"
    };
  }

  if (new Date(hold.expiresAt).getTime() <= Date.now()) {
    expireHold(holdCode);
    return {
      success: false,
      reason: "hold_expired"
    };
  }

  if (hold.extensionCount >= settings.maximumExtensionsPerHold) {
    return {
      success: false,
      reason: "maximum_extensions_reached"
    };
  }

  const newExpiry = new Date(
    Date.now() + settings.holdExpirySeconds * 1000
  );

  hold.expiresAt = newExpiry.toISOString();
  hold.extensionCount++;

  const seat = seats.get(hold.seatNumber);

  if (seat) {
    seat.expiresAt = hold.expiresAt;
    seat.extensionCount = hold.extensionCount;
  }

  addEvent({
    type: "hold extended",
    seatNumber: hold.seatNumber,
    email,
    holdCode
  });

  return {
    success: true,
    expiresAt: hold.expiresAt,
    extensionCount: hold.extensionCount
  };
}

function confirmHold(email, holdCode) {
  const hold = holds.get(holdCode);

  if (!hold || hold.email !== email) {
    return {
      success: false,
      reason: "hold_not_found"
    };
  }

  if (hold.status === "Confirmed") {
    return {
      success: true,
      message: "Hold already confirmed",
      seatNumber: hold.seatNumber,
      holdCode
    };
  }

  if (hold.status !== "Held") {
    return {
      success: false,
      reason: "hold_not_active"
    };
  }

  if (new Date(hold.expiresAt).getTime() <= Date.now()) {
    expireHold(holdCode);

    return {
      success: false,
      reason: "hold_expired"
    };
  }

  hold.status = "Confirmed";
  hold.expiresAt = null;

  const seat = seats.get(hold.seatNumber);

  seat.status = "Confirmed";
  seat.expiresAt = null;

  addEvent({
    type: "hold confirmed",
    seatNumber: hold.seatNumber,
    email,
    holdCode
  });

  return {
    success: true,
    message: "Seat confirmed",
    seatNumber: hold.seatNumber,
    holdCode
  };
}

function releaseSeat(email, holdCode) {
  const hold = holds.get(holdCode);

  if (!hold || hold.email !== email) {
    return {
      success: false,
      reason: "hold_not_found"
    };
  }

  if (hold.status !== "Held" && hold.status !== "Confirmed") {
    return {
      success: false,
      reason: "seat_not_releasable"
    };
  }

  const seatNumber = hold.seatNumber;
  const seat = seats.get(seatNumber);

  seat.status = "Available";
  seat.email = null;
  seat.holdCode = null;
  seat.heldAt = null;
  seat.expiresAt = null;
  seat.extensionCount = 0;

  hold.status = "Released";

  addEvent({
    type: "seat released",
    seatNumber,
    email,
    holdCode
  });

  promoteWaitlist(seatNumber);

  return {
    success: true,
    message: "Seat released",
    seatNumber
  };
}

function expireHold(holdCode) {
  const hold = holds.get(holdCode);

  if (!hold || hold.status !== "Held") {
    return false;
  }

  const seatNumber = hold.seatNumber;
  const seat = seats.get(seatNumber);

  seat.status = "Available";
  seat.email = null;
  seat.holdCode = null;
  seat.heldAt = null;
  seat.expiresAt = null;
  seat.extensionCount = 0;

  hold.status = "Expired";

  addEvent({
    type: "hold expired",
    seatNumber,
    email: hold.email,
    holdCode
  });

  promoteWaitlist(seatNumber);

  return true;
}

function checkExpiredHolds() {
  const now = Date.now();

  for (const [holdCode, hold] of holds.entries()) {
    if (
      hold.status === "Held" &&
      new Date(hold.expiresAt).getTime() <= now
    ) {
      expireHold(holdCode);
    }
  }
}

function joinWaitlist(email) {
  const availableSeat = [...seats.values()].some(
    (seat) => seat.status === "Available"
  );

  if (availableSeat) {
    return {
      success: false,
      reason: "seat_available_join_waitlist_not_allowed"
    };
  }

  if (waitlist.includes(email)) {
    return {
      success: false,
      reason: "already_on_waitlist"
    };
  }

  const hasActiveHold = [...holds.values()].some(
    (hold) =>
      hold.email === email &&
      (hold.status === "Held" || hold.status === "Confirmed")
  );

  if (hasActiveHold) {
    return {
      success: false,
      reason: "user_already_has_reservation"
    };
  }

  waitlist.push(email);

  addEvent({
    type: "waitlist joined",
    email
  });

  return {
    success: true,
    message: "Added to waitlist",
    position: waitlist.length
  };
}

function promoteWaitlist(seatNumber) {
  if (waitlist.length === 0) {
    return null;
  }

  const email = waitlist.shift();

  const seat = seats.get(seatNumber);

  if (!seat || seat.status !== "Available") {
    waitlist.unshift(email);
    return null;
  }

  const now = new Date();

  const holdCode = createUniqueHoldCode();

  const expiresAt = new Date(
    now.getTime() + settings.holdExpirySeconds * 1000
  );

  const hold = {
    holdCode,
    seatNumber,
    email,
    status: "Held",
    placedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    extensionCount: 0,
    promotedFromWaitlist: true
  };

  seat.status = "Held";
  seat.email = email;
  seat.holdCode = holdCode;
  seat.heldAt = now.toISOString();
  seat.expiresAt = expiresAt.toISOString();
  seat.extensionCount = 0;

  holds.set(holdCode, hold);

  addEvent({
    type: "waitlist promoted",
    seatNumber,
    email,
    holdCode
  });

  console.log(
    `Waitlist promotion: ${email} received seat ${seatNumber}. Hold code: ${holdCode}`
  );

  return {
    email,
    seatNumber,
    holdCode,
    expiresAt: expiresAt.toISOString()
  };
}

function getSeats() {
  return [...seats.values()].map((seat) => ({
    seatNumber: seat.seatNumber,
    status: seat.status,
    email: seat.email,
    expiresAt: seat.expiresAt
  }));
}

module.exports = {
  placeHold,
  extendHold,
  confirmHold,
  releaseSeat,
  joinWaitlist,
  checkExpiredHolds,
  getSeats
};