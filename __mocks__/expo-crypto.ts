import { randomUUID } from "node:crypto";

const actual = jest.requireActual("expo-crypto");

module.exports = {
  ...actual,
  randomUUID: () => randomUUID(),
};
