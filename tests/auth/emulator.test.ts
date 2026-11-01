import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const enabled = Boolean(emulatorHost);

test("Firebase Auth Emulator supports signup, login, and rejects a bad password", { skip: !enabled }, async () => {
  assert.ok(emulatorHost === "127.0.0.1:9099" || emulatorHost === "localhost:9099", "Auth tests must use the local emulator");
  assert.equal(process.env.GCLOUD_PROJECT, "demo-koko-auth-tests", "Auth tests must use the isolated demo project");

  const api = `http://${emulatorHost}/identitytoolkit.googleapis.com/v1`;
  const email = `${randomUUID()}@auth-test.invalid`;
  const password = `Test-${randomUUID()}-Aa1!`;

  async function request(endpoint: string, body: object) {
    return fetch(`${api}/${endpoint}?key=demo-local-api-key`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const signup = await request("accounts:signUp", { email, password, returnSecureToken: true });
  assert.equal(signup.status, 200, await signup.clone().text());
  const created = await signup.json() as { localId: string; idToken: string; email: string };
  assert.ok(created.localId);
  assert.ok(created.idToken);
  assert.equal(created.email, email);

  const login = await request("accounts:signInWithPassword", { email, password, returnSecureToken: true });
  assert.equal(login.status, 200, await login.clone().text());
  const signedIn = await login.json() as { localId: string; idToken: string };
  assert.equal(signedIn.localId, created.localId);
  assert.ok(signedIn.idToken);

  const badPassword = await request("accounts:signInWithPassword", {
    email,
    password: `${password}-wrong`,
    returnSecureToken: true,
  });
  assert.equal(badPassword.status, 400);
  assert.match(await badPassword.text(), /INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD/);
});
