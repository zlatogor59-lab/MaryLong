export const catalogOperations=Object.freeze({
  'import-carbohydrate-context':'import-carbohydrate-context.mjs',
  'import-carbohydrate-quality':'import-carbohydrate-quality.mjs',
  'import-fat-profiles':'import-fat-profiles.mjs',
  'seed-local':'seed-local-food-products.mjs',
  'sync-dairy-eggs-fat':'sync-dairy-eggs-fat-profiles.mjs',
  'sync-photo-001-minerals':'sync-photo-001-mineral-profiles.mjs',
  'sync-photo-001-products':'sync-photo-001-products.mjs',
  'sync-photo-001-vitamins':'sync-photo-001-vitamin-profiles.mjs',
  'sync-processed-meat':'sync-processed-meat-products.mjs',
  'sync-salt-coffee':'sync-salt-coffee-products.mjs',
  'sync-seafood':'sync-seafood-products.mjs',
  'sync-ua-priority':'sync-ua-priority-products.mjs',
});

export function parseCatalogOperationArgs(args){
  const apply=args.includes('--apply'),positional=args.filter(arg=>!arg.startsWith('--')),unknown=args.filter(arg=>arg.startsWith('--')&&arg!=='--apply');
  if(unknown.length)throw new Error(`UNKNOWN_ARGUMENT:${unknown.join(',')}`);
  if(positional.length!==1||!catalogOperations[positional[0]])throw new Error(`UNKNOWN_OPERATION:${positional.join(',')||'missing'}`);
  return{operation:positional[0],script:catalogOperations[positional[0]],mode:apply?'apply':'dry_run',apply};
}

export function parseScriptOutput(output){
  const trimmed=output.trim();if(!trimmed)return null;
  try{return JSON.parse(trimmed);}catch{}
  return trimmed.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
}

export function requireLocalDatabase(value){
  let url;try{url=new URL(value||'');}catch{throw new Error('DATABASE_URL_REQUIRED');}
  if(!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('LOCAL_DATABASE_REQUIRED');
  return url.pathname.slice(1);
}
