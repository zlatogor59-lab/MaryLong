import { HttpStatus, Injectable } from '@nestjs/common';
import { AppError } from '../common/app-error';

@Injectable()
export class ImportRateLimiterService {
  private readonly attempts=new Map<string,number[]>();
  check(key:string,now=Date.now()) {
    const recent=(this.attempts.get(key)??[]).filter(x=>now-x<60_000);
    if(recent.length>=10)throw new AppError('RATE_LIMITED',HttpStatus.TOO_MANY_REQUESTS,'IMPORT_RATE_LIMIT');
    recent.push(now);this.attempts.set(key,recent);
  }
}
