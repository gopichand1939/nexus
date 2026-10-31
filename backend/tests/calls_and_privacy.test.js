import test from 'node:test';
import assert from 'node:assert/strict';
import {createCallsService} from '../src/modules/calls/calls.service.js';
import {createContactsService} from '../src/modules/contacts/contacts.service.js';
import {createUsersService} from '../src/modules/users/users.service.js';

test('call logging validates required fields and normalizes duration', async () => {
 let logged = null;
 const service = createCallsService({
  log: async (userId, data) => { logged = {userId, ...data}; return logged; }
 });
 await assert.rejects(() => service.log('@alice:nexus.test', {peerId: '', callType: 'video', direction: 'outgoing', status: 'completed'}), {code: 'INVALID_INPUT'});
 await assert.rejects(() => service.log('@alice:nexus.test', {peerId: '@bob:nexus.test', callType: 'unknown', direction: 'outgoing', status: 'completed'}), {code: 'INVALID_INPUT'});
 const res = await service.log('@alice:nexus.test', {peerId: '@bob:nexus.test', peerName: 'Bob', callType: 'video', direction: 'outgoing', status: 'completed', durationSeconds: 45});
 assert.equal(res.durationSeconds, 45);
 assert.equal(res.peerName, 'Bob');
 assert.equal(logged.userId, '@alice:nexus.test');
});

test('blocking a user prevents adding them as a contact', async () => {
 let blockedChecked = false;
 const service = createContactsService({
  isBlocked: async () => { blockedChecked = true; return true; },
  add: async () => {}
 }, {matrixServer: 'nexus.test'});
 await assert.rejects(() => service.add('@alice:nexus.test', {userId: '@bob:nexus.test'}), {code: 'BLOCKED_USER'});
 assert.ok(blockedChecked);
});

test('user search rejects blocked users and enforces contacts_only policy', async () => {
 const usersService = createUsersService({
  model: {
   search: async name => {
    if (name === 'bob') return {id: '@bob:nexus.test', username: 'bob', display_name: 'Bob', preferences: {contactPolicy: 'contacts_only'}};
    return null;
   }
  },
  contactsModel: {
   isBlocked: async (reqId, targetId) => false,
   hasContact: async (ownerId, contactId) => false
  },
  matrix: {},
  vault: {}
 });
 await assert.rejects(() => usersService.search('bob', '@stranger:nexus.test'), {code: 'CONTACTS_ONLY'});
});
