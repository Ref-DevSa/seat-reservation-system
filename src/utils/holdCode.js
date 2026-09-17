const characters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateHoldCode() {
  let code = "";

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

module.exports = {
  generateHoldCode
};