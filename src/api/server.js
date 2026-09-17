const express = require("express");
const path = require("path");

const {
  placeHold,
  extendHold,
  confirmHold,
  releaseSeat,
  joinWaitlist,
  checkExpiredHolds,
  getSeats
} = require("../services/reservationService");

const { getEventLog } = require("../services/eventLogService");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));

app.get("/api/seats", (req, res) => {
  res.json(getSeats());
});

app.post("/api/holds", (req, res) => {
  const { email, seatNumber } = req.body;

  if (!email || seatNumber === undefined) {
    return res.status(400).json({
      success: false,
      reason: "email_and_seat_required"
    });
  }

  const result = placeHold(email, Number(seatNumber));

  res.status(result.success ? 200 : 400).json(result);
});

app.post("/api/holds/extend", (req, res) => {
  const { email, holdCode } = req.body;

  if (!email || !holdCode) {
    return res.status(400).json({
      success: false,
      reason: "email_and_hold_code_required"
    });
  }

  const result = extendHold(email, holdCode);

  res.status(result.success ? 200 : 400).json(result);
});

app.post("/api/holds/confirm", (req, res) => {
  const { email, holdCode } = req.body;

  if (!email || !holdCode) {
    return res.status(400).json({
      success: false,
      reason: "email_and_hold_code_required"
    });
  }

  const result = confirmHold(email, holdCode);

  res.status(result.success ? 200 : 400).json(result);
});

app.post("/api/holds/release", (req, res) => {
  const { email, holdCode } = req.body;

  if (!email || !holdCode) {
    return res.status(400).json({
      success: false,
      reason: "email_and_hold_code_required"
    });
  }

  const result = releaseSeat(email, holdCode);

  res.status(result.success ? 200 : 400).json(result);
});

app.post("/api/waitlist", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      reason: "email_required"
    });
  }

  const result = joinWaitlist(email);

  res.status(result.success ? 200 : 400).json(result);
});

app.get("/api/events", (req, res) => {
  res.json(getEventLog());
});

setInterval(() => {
  checkExpiredHolds();
}, 1000);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});