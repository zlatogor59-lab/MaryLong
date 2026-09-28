import {requireLocalDatabase} from './catalog-operation-cli.mjs';

export function verifyCatalogDatabase(args,databaseUrl){
  const prefix='--confirm-database=',matches=args.filter(arg=>arg.startsWith(prefix)),unknown=args.filter(arg=>!arg.startsWith(prefix));
  if(unknown.length||matches.length!==1)throw new Error(unknown.length?`UNKNOWN_ARGUMENT:${unknown.join(',')}`:'CONFIRM_DATABASE_REQUIRED');
  const actual=requireLocalDatabase(databaseUrl),confirmed=matches[0].slice(prefix.length);
  if(!confirmed||confirmed!==actual)throw new Error('CONFIRMED_DATABASE_MISMATCH');
  return actual;
}
