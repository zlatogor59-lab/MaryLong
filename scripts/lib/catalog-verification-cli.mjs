import {requireLocalDatabase} from './catalog-operation-cli.mjs';

export function verifyCatalogDatabase(args,databaseUrl){
  const prefix='--confirm-database=',matches=args.filter(arg=>arg.startsWith(prefix)),unknown=args.filter(arg=>!arg.startsWith(prefix));
  if(unknown.length||matches.length!==1)throw new Error(unknown.length?`UNKNOWN_ARGUMENT:${unknown.join(',')}`:'CONFIRM_DATABASE_REQUIRED');
  const actual=requireLocalDatabase(databaseUrl),confirmed=matches[0].slice(prefix.length);
  if(!confirmed||confirmed!==actual)throw new Error('CONFIRMED_DATABASE_MISMATCH');
  return actual;
}

export const catalogVerificationExitCodes=Object.freeze({configuration:2,migrations:10,build:11,tests:12,postgresql:13,version_audit:14,browser:15});
export const catalogVerificationCode=step=>step?`FAILED_${step.toUpperCase()}`:'PASSED';
