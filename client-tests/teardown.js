import { rm } from 'node:fs/promises';

export default async function teardown() {
  await rm(process.env.CLIENT_TEST_HISTORY_FILE, { force: true });
}
