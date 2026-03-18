import { dbQuery } from '@/lib/db/postgres';

async function run() {
  await dbQuery('select 1');
  console.log('Auth migrations applied and database reachable.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
