import { describe,expect,it } from 'vitest';
import { CsvParserService } from './csv-parser.service';
const parser=new CsvParserService(); const bytes=(s:string)=>new TextEncoder().encode(s);
describe('safe CSV parser',()=>{
  it('parses BOM and CRLF',()=>expect(parser.parseSingleResponse(bytes('\uFEFFa,b\r\n1,2\r\n'))).toEqual({headers:['a','b'],values:['1','2']}));
  it('preserves commas, quotes and line breaks inside quoted fields',()=>expect(parser.parseSingleResponse(bytes('a,b\n"one, two","line 1\nline ""2"""'))).toEqual({headers:['a','b'],values:['one, two','line 1\nline "2"']}));
  it('rejects malformed quotes',()=>expect(()=>parser.parseSingleResponse(bytes('a\n"broken'))).toThrow('CSV_MALFORMED'));
  it('rejects more than one response per request',()=>expect(()=>parser.parseSingleResponse(bytes('a\n1\n2'))).toThrow('CSV_SINGLE_RESPONSE_REQUIRED'));
  it('rejects a mismatched row width',()=>expect(()=>parser.parseSingleResponse(bytes('a,b\n1'))).toThrow('ROW_WIDTH_MISMATCH'));
});
