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

    it('règle une dette avec plusieurs créditeurs et plusieurs débiteurs', () => {
        // a et b sont créditeurs, c et d sont débiteurs
        const balances = { a: 15, b: 5, c: -12, d: -8 };

        const settlements = simplifyDebts(balances);

        // Vérifie que le nombre de settlements est minimal
        // et que le total réglé correspond bien aux montants dus
        expect(settlements.length).toBeLessThanOrEqual(3);

        // Vérifie que chaque créditeur reçoit bien son dû au total
        const totalToA = settlements.filter((s) => s.to === 'a').reduce((sum, s) => sum + s.amount, 0);
        const totalToB = settlements.filter((s) => s.to === 'b').reduce((sum, s) => sum + s.amount, 0);
        expect(totalToA).toBeCloseTo(15);
        expect(totalToB).toBeCloseTo(5);

        // Vérifie que chaque débiteur paie bien son dû au total
        const totalFromC = settlements.filter((s) => s.from === 'c').reduce((sum, s) => sum + s.amount, 0);
        const totalFromD = settlements.filter((s) => s.from === 'd').reduce((sum, s) => sum + s.amount, 0);
        expect(totalFromC).toBeCloseTo(12);
        expect(totalFromD).toBeCloseTo(8);
    });

    it('ne plante pas et retourne [] si un créditeur existe sans débiteur (cas impossible en pratique mais robustesse)', () => {
        const balances = { a: 5 };
        expect(simplifyDebts(balances)).toEqual([]);
    });

    it('exclut un solde à 0 de la recherche du créditeur (le débiteur seul ne suffit pas)', () => {
        const balances = { a: 0, b: -5 };
        expect(simplifyDebts(balances)).toEqual([]);
    });

    it('exclut un solde à 0 de la recherche du débiteur (le créditeur seul ne suffit pas)', () => {
        const balances = { a: 5, b: 0 };
        expect(simplifyDebts(balances)).toEqual([]);
    });

    it('en cas d\'égalité entre deux créditeurs, garde le premier rencontré (ordre exact vérifié)', () => {
        const balances = { a: 15, b: 15, c: -30 };
        expect(simplifyDebts(balances)).toEqual([
            { from: 'c', to: 'a', amount: 15 },
            { from: 'c', to: 'b', amount: 15 },
        ]);
    });

    it('sélectionne le vrai plus grand créditeur même s\'il n\'est pas le premier de la liste', () => {
        const balances = { a: 10, b: 20, c: -30 };
        expect(simplifyDebts(balances)).toEqual([
            { from: 'c', to: 'b', amount: 20 },
            { from: 'c', to: 'a', amount: 10 },
        ]);
    });

    it('en cas d\'égalité entre deux débiteurs, garde le premier rencontré (ordre exact vérifié)', () => {
        const balances = { a: 30, b: -15, c: -15 };
        expect(simplifyDebts(balances)).toEqual([
            { from: 'b', to: 'a', amount: 15 },
            { from: 'c', to: 'a', amount: 15 },
        ]);
    });

    it('sélectionne le vrai plus grand débiteur même s\'il n\'est pas le premier de la liste', () => {
        const balances = { a: 30, b: -5, c: -25 };
        expect(simplifyDebts(balances)).toEqual([
            { from: 'c', to: 'a', amount: 25 },
            { from: 'b', to: 'a', amount: 5 },
        ]);
    });
});