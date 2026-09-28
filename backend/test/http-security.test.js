const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../index');
const server = app.listen(0, '127.0.0.1');
const base = new Promise(resolve => server.once('listening', () => resolve(`http://127.0.0.1:${server.address().port}`)));

test('health endpoint reports service readiness without exposing records', async () => {
  const response = await fetch(`${await base}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(typeof body.database, 'string');
  assert.equal('patients' in body, false);
});

test('protected workspaces fail closed when Firebase Admin is not configured', async () => {
  for (const path of ['/api/auth/me', '/api/employee/appointments', '/api/doctor/patients']) {
    const response = await fetch(`${await base}${path}`);
    assert.equal(response.status, 503, path);
  }
});

test('legacy unprotected patient and appointment collection routes are not registered', async () => {
  for (const path of ['/api/patients', '/api/appointments']) {
    const response = await fetch(`${await base}${path}`);
    assert.equal(response.status, 404, path);
  }
});

test.after(async () => new Promise(resolve => server.close(resolve)));
