import { hasServiceAccountCreds } from "../google-service-account";
import { searchConsoleStub } from "./search-console.stub";
import { SearchConsoleRealAdapter } from "./search-console.real";

export type { SearchConsoleAdapter, TopPage } from "./types";

/** Default window for Search Console — 28 days to account for the ~2-3 day data lag. */
export const SC_DAYS = 28;

const scUseStub = !hasServiceAccountCreds() || !process.env.SEARCH_CONSOLE_PROPERTY_URL;

console.log(`[TRAFFIC] searchconsole=${scUseStub ? "stub" : "real"}`);

export const searchConsoleAdapter = scUseStub
  ? searchConsoleStub
  : new SearchConsoleRealAdapter();
