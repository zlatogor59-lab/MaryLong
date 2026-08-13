import { HttpStatus, Injectable } from '@nestjs/common';
import { AppError } from '../common/app-error';

@Injectable()
export class CsvParserService {
  parseSingleResponse(input: Uint8Array): {headers:string[];values:string[]} {
    if (input.byteLength > 2 * 1024 * 1024) throw new AppError('CSV_TOO_LARGE',HttpStatus.PAYLOAD_TOO_LARGE);
    const text = new TextDecoder('utf-8',{fatal:true}).decode(input).replace(/^\uFEFF/,'');
    const rows:string[][]=[]; let row:string[]=[]; let field=''; let quoted=false;
    for(let i=0;i<text.length;i++) {
      const ch=text[i];
      if(quoted) {
        if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}
        else if(ch==='"'){quoted=false;}
        else field+=ch;
      } else if(ch==='"'&&field===''){quoted=true;}
      else if(ch===','){row.push(field);field='';}
      else if(ch==='\r'&&text[i+1]==='\n'){row.push(field);rows.push(row);row=[];field='';i++;}
      else if(ch==='\n'||ch==='\r'){row.push(field);rows.push(row);row=[];field='';}
      else field+=ch;
    }
    if(quoted) throw new AppError('CSV_MALFORMED',HttpStatus.UNPROCESSABLE_ENTITY);
    if(field!==''||row.length){row.push(field);rows.push(row);}
    while(rows.length&&rows.at(-1)?.every(x=>x===''))rows.pop();
    if(rows.length!==2) throw new AppError('CSV_SINGLE_RESPONSE_REQUIRED',HttpStatus.UNPROCESSABLE_ENTITY);
    if(rows[0].length!==rows[1].length) throw new AppError('ROW_WIDTH_MISMATCH',HttpStatus.UNPROCESSABLE_ENTITY);
    if(rows[0].some(x=>!x)) throw new AppError('CSV_HEADER_EMPTY',HttpStatus.UNPROCESSABLE_ENTITY);
    return {headers:rows[0],values:rows[1]};
  }
}
