import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const registry=JSON.parse(readFileSync(resolve(process.cwd(),'docs/ukrainian-food-catalog-priority-v1.json'),'utf8'));

describe('Ukrainian catalog priority matching',()=>{
  it('matches milk 2.5% only to the dedicated 2.5% card',()=>{const milk=registry.items.find((item:{id:string})=>item.id==='milk');expect(milk.match_terms).toEqual(['молоко 2,5%']);expect(milk.match_terms).not.toContain('молоко 1,5–2%');});
});
