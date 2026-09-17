const test = require("node:test");
const assert = require("node:assert");

const {
  generateHoldCode
} = require("../src/utils/holdCode");

test("hold code is six characters long", () => {
  const code = generateHoldCode();

  assert.strictEqual(code.length, 6);
});

test("hold code contains only allowed characters", () => {
  const code = generateHoldCode();

  assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
});