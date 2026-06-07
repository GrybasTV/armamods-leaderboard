import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesAllSearchTokens,
  matchesServerSearch,
} from '../web/functions/lib/search-match.ts';

describe('matchesAllSearchTokens', () => {
  it('matches when all words appear in any order', () => {
    assert.equal(
      matchesAllSearchTokens('Relax Ukraine | PVP', 'ukraine relax'),
      true
    );
    assert.equal(matchesAllSearchTokens('Relax Ukraine', 'relax ukraine'), true);
  });

  it('fails when a token is missing', () => {
    assert.equal(matchesAllSearchTokens('Relax Ukraine', 'relax poland'), false);
  });
});

describe('matchesServerSearch', () => {
  it('searches name and ip fields', () => {
    assert.equal(
      matchesServerSearch({ name: 'My Server', ip: '1.2.3.4' }, '1.2.3'),
      true
    );
  });
});
