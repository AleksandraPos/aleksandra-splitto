import { describe, it, expect } from 'vitest';
import { simplifyDebts } from '../../src/domain/simplify';

describe('simplifyDebts', () => {
    it('règle une dette simple entre 2 personnes', () => {
        const balances = { a: 10, b: -10 };

        const settlements = simplifyDebts(balances);

        expect(settlements).toEqual([{ from: 'b', to: 'a', amount: 10 }]);
    });

    it('règle un triangle de 3 personnes avec un solde nul', () => {
        const balances = { a: 10, b: 0, c: -10 };

        const settlements = simplifyDebts(balances);

        expect(settlements).toEqual([{ from: 'c', to: 'a', amount: 10 }]);
    });

    it('règle une dette circulaire complexe entre 4 personnes avec plusieurs settlements', () => {
        const balances = { a: 30, b: -20, c: -10, d: 0 };

        const settlements = simplifyDebts(balances);

        expect(settlements).toEqual([
            { from: 'b', to: 'a', amount: 20 },
            { from: 'c', to: 'a', amount: 10 },
        ]);
    });
});