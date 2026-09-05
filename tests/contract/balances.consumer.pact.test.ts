import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'node:path';
import axios from 'axios';

const { like, eachLike } = MatchersV3;

const provider = new PactV3({
    consumer: 'splitto-frontend',
    provider: 'splitto-api',
    dir: path.resolve(process.cwd(), 'pacts'),
});

describe('GET /api/groups/:id/balances (consumer)', () => {
    it('retourne 200 avec les balances quand le groupe existe et a des dépenses', async () => {
        provider
            .given('group-1 a 3 membres et 2 dépenses')
            .uponReceiving('une requête pour les balances de group-1')
            .withRequest({
                method: 'GET',
                path: '/api/groups/group-1/balances',
            })
            .willRespondWith({
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: {
                    groupId: like('group-1'),
                    balances: like({ alice: 20, bob: -10, charlie: -10 }),
                    settlements: eachLike({
                        from: like('member-1'),
                        to: like('member-2'),
                        amount: like(10),
                    }),
                },
            });

        await provider.executeTest(async (mockServer) => {
            const response = await axios.get(`${mockServer.url}/api/groups/group-1/balances`);

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('balances');
            expect(response.data).toHaveProperty('settlements');
        });
    });

    it('retourne 404 quand le groupe n\'existe pas', async () => {
        provider
            .given('aucun groupe inexistant')
            .uponReceiving('une requête pour les balances d\'un groupe inexistant')
            .withRequest({
                method: 'GET',
                path: '/api/groups/inexistant/balances',
            })
            .willRespondWith({
                status: 404,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: {
                    error: like('Group not found'),
                },
            });

        await provider.executeTest(async (mockServer) => {
            try {
                await axios.get(`${mockServer.url}/api/groups/inexistant/balances`);
                throw new Error('Should have thrown 404');
            } catch (err: any) {
                expect(err.response.status).toBe(404);
            }
        });
    });
});