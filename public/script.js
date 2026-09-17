const seatsContainer = document.getElementById("seats");
const message = document.getElementById("message");

async function loadSeats() {
  const response = await fetch("/api/seats");
  const seats = await response.json();

  seatsContainer.innerHTML = "";

  seats.forEach((seat) => {
    const element = document.createElement("div");

    element.className = `seat ${seat.status.toLowerCase()}`;

    element.textContent = `Seat ${seat.seatNumber}`;

    element.onclick = () => {
      document.getElementById("seatNumber").value = seat.seatNumber;
    };

    seatsContainer.appendChild(element);
  });
}

function showMessage(text) {
  message.textContent = text;
}

document
  .getElementById("holdForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const seatNumber = document.getElementById("seatNumber").value;

    const response = await fetch("/api/holds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        seatNumber
      })
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById("manageEmail").value = email;
      document.getElementById("holdCode").value = result.holdCode;

      showMessage(
        `Seat ${result.seatNumber} held. Hold code: ${result.holdCode}. Expires: ${result.expiresAt}`
      );
    } else {
      showMessage(`Request rejected: ${result.reason}`);
    }

    loadSeats();
  });

async function extendHold() {
  const result = await manageRequest("/api/holds/extend");

  if (result.success) {
    showMessage(`Hold extended. New expiry: ${result.expiresAt}`);
  } else {
    showMessage(`Request rejected: ${result.reason}`);
  }

  loadSeats();
}

async function confirmHold() {
  const result = await manageRequest("/api/holds/confirm");

  if (result.success) {
    showMessage(`Seat ${result.seatNumber} confirmed.`);
  } else {
    showMessage(`Request rejected: ${result.reason}`);
  }

  loadSeats();
}

async function releaseHold() {
  const result = await manageRequest("/api/holds/release");

  if (result.success) {
    showMessage(`Seat ${result.seatNumber} released.`);
  } else {
    showMessage(`Request rejected: ${result.reason}`);
  }

  loadSeats();
}

async function manageRequest(endpoint) {
  const email = document.getElementById("manageEmail").value;
  const holdCode = document.getElementById("holdCode").value;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      holdCode
    })
  });

  return response.json();
}

async function joinWaitlist() {
  const email = document.getElementById("waitlistEmail").value;

  const response = await fetch("/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  });

  const result = await response.json();

  if (result.success) {
    showMessage(`You joined the waitlist at position ${result.position}.`);
  } else {
    showMessage(`Request rejected: ${result.reason}`);
  }
}

async function loadEvents() {
  const response = await fetch("/api/events");
  const events = await response.json();

  document.getElementById("events").textContent =
    JSON.stringify(events, null, 2);
}

loadSeats();

setInterval(loadSeats, 2000);