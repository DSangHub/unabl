import test from 'node:test';
import assert from 'node:assert/strict';
import {groupHostEvents} from '../event-archive.js';

test('archives events after a full day, keeping the most recent past events first',()=>{
 const now=Date.parse('2026-11-06T20:00:00Z');
 const item=(id,offset)=>({id,starts_at:new Date(now+offset).toISOString()});
 const events=[item('old',-172800000),item('future',3600000),item('recent',-86399999),item('boundary',-86400000),{id:'undated'}];
 const {active,archived}=groupHostEvents(events,now);
 assert.deepEqual(active.map(e=>e.id),['recent','future','undated']);
 assert.deepEqual(archived.map(e=>e.id),['boundary','old']);
 assert.equal(events.length,5);
});
