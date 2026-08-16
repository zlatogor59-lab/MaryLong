import {Injectable} from '@nestjs/common';import {PrismaService} from '../database/prisma.service';import type {ProductSnapshot,ProteinOrigin} from './protein-intake.calculator';
type Row={id:string;canonical_name:string;protein_per_100g:unknown;origin:ProteinOrigin;plant_share_percent:number;source_label:string;source_reference:string|null;version:number};
const map=(r:Row):ProductSnapshot=>({id:r.id,name:r.canonical_name,proteinPer100g:Number(r.protein_per_100g),origin:r.origin,plantSharePercent:r.plant_share_percent,sourceLabel:r.source_label,sourceReference:r.source_reference,version:r.version});
@Injectable() export class FoodProductRepository {constructor(private readonly prisma:PrismaService){}
  async listVerified(){const rows=await this.prisma.$queryRaw<Row[]>`SELECT id,canonical_name,protein_per_100g,origin::text,plant_share_percent,source_label,source_reference,version FROM food_product_cards WHERE status='verified' ORDER BY canonical_name`;return rows.map(map);}
  async verifiedByIds(ids:string[]){if(!ids.length)return new Map<string,ProductSnapshot>();const rows=await this.prisma.$queryRawUnsafe<Row[]>(`SELECT id,canonical_name,protein_per_100g,origin::text,plant_share_percent,source_label,source_reference,version FROM food_product_cards WHERE status='verified' AND id=ANY($1::uuid[])`,ids);return new Map(rows.map(row=>[row.id,map(row)]));}
}
