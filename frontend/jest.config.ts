import type { Config } from "jest";
import nextJest from "next/jest.js";

process.env.API_URL ??= "http://api.test/api";

// 日付の計算が端末のタイムゾーンに引きずられていないかを、すべてのテストで確かめるため
process.env.TZ = "America/Los_Angeles";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jest-fixed-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default createJestConfig(config);
