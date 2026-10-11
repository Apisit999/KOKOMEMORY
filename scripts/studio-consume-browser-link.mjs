import { readFile } from "node:fs/promises";
const fixture = JSON.parse(await readFile("output/studio/browser-fixture.json", "utf8"));
const response = await fetch("http://localhost:3040/v1/desktop/device-authorizations/poll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ authorizationId: fixture.authorizationId, deviceCode: fixture.deviceCode }) });
const body = await response.json();
if (!response.ok || body.status !== "approved" || typeof body.entitlement !== "string") throw new Error("Local browser linking was not completed");
console.log("Approved link consumed by demo Desktop client. Entitlement is not printed.");
