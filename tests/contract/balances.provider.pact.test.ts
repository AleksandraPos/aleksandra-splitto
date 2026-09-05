import { describe, it, beforeAll, afterAll } from 'vitest';
import { Verifier } from '@pact-foundation/pact';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import { createApp } from '../../src/server';

describe('splitto-api (provider)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let server: Server;
  const PORT = 8081;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });

    const migration = readFileSync('migrations/001-initial.sql', 'utf-8');
    await pool.query(migration);

    const app = createApp(pool);
    server = app.listen(PORT);
  }, 60_000);

  afterAll(async () => {
    server.close();
    await pool.end();
    await container.stop();
  });

  it('valide le contrat avec le consumer splitto-frontend', async () => {
    const verifier = new Verifier({
      provider: 'splitto-api',
      providerBaseUrl: `http://localhost:${PORT}`,
      pactUrls: [path.resolve(process.cwd(), 'pacts', 'splitto-frontend-splitto-api.json')],
      stateHandlers: {
        'group-1 a 3 membres et 2 dépenses': async () => {
          await pool.query('TRUNCATE groups CASCADE');

          await pool.query(
            `INSERT INTO groups (id, name, currency) VALUES ('group-1', 'Vacances', 'EUR')`,
          );
          await pool.query(`
            INSERT INTO members (id, group_id, name, email) VALUES
              ('alice', 'group-1', 'Alice', 'alice@test.fr'),
              ('bob', 'group-1', 'Bob', 'bob@test.fr'),
              ('charlie', 'group-1', 'Charlie', 'charlie@test.fr')
          `);
          await pool.query(`
            INSERT INTO expenses
              (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data)
            VALUES
              ('exp-1', 'group-1', 'Dîner', 30, 'EUR', 'alice', NOW(), 'equal',
               '{"beneficiaries":["alice","bob","charlie"]}'),
              ('exp-2', 'group-1', 'Taxi', 15, 'EUR', 'bob', NOW() - interval '1 day', 'equal',
               '{"beneficiaries":["alice","bob","charlie"]}')
          `);

          return Promise.resolve();
        },
        'aucun groupe inexistant': async () => {
          await pool.query('TRUNCATE groups CASCADE');
          return Promise.resolve();
        },
      },
    });

    await verifier.verifyProvider();
  }, 30_000);
});