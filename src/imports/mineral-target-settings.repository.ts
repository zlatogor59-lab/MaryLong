import {Injectable} from '@nestjs/common';
import {PrismaService} from '../database/prisma.service';

export type MineralTargets={magnesiumTargetMg:number|null;ironTargetMg:number|null;zincTargetMg:number|null;copperTargetUg:number|null;manganeseTargetMg:number|null;molybdenumTargetUg:number|null;seleniumTargetUg:number|null;seleniumUpperLevelUg:number|null;iodineTargetUg:number|null;iodineUpperLevelUg:number|null;version:number};
type Row={magnesium_target_mg:unknown;iron_target_mg:unknown;zinc_target_mg:unknown;copper_target_ug:unknown;manganese_target_mg:unknown;molybdenum_target_ug:unknown;selenium_target_ug:unknown;selenium_upper_level_ug:unknown;iodine_target_ug:unknown;iodine_upper_level_ug:unknown;version:number};
const numberOrNull=(value:unknown)=>value===null?null:Number(value);
const map=(row:Row):MineralTargets=>({magnesiumTargetMg:numberOrNull(row.magnesium_target_mg),ironTargetMg:numberOrNull(row.iron_target_mg),zincTargetMg:numberOrNull(row.zinc_target_mg),copperTargetUg:numberOrNull(row.copper_target_ug),manganeseTargetMg:numberOrNull(row.manganese_target_mg),molybdenumTargetUg:numberOrNull(row.molybdenum_target_ug),seleniumTargetUg:numberOrNull(row.selenium_target_ug),seleniumUpperLevelUg:numberOrNull(row.selenium_upper_level_ug),iodineTargetUg:numberOrNull(row.iodine_target_ug),iodineUpperLevelUg:numberOrNull(row.iodine_upper_level_ug),version:row.version});
const columns=`magnesium_target_mg,iron_target_mg,zinc_target_mg,copper_target_ug,manganese_target_mg,molybdenum_target_ug,selenium_target_ug,selenium_upper_level_ug,iodine_target_ug,iodine_upper_level_ug,version`;

@Injectable()
export class MineralTargetSettingsRepository{
  constructor(private readonly prisma:PrismaService){}
  async get(clientId:string){const rows=await this.prisma.$queryRawUnsafe<Row[]>(`SELECT ${columns} FROM client_mineral_targets WHERE client_id=$1::uuid`,clientId);return rows[0]?map(rows[0]):null;}
  async save(input:Omit<MineralTargets,'version'>&{clientId:string;updatedBy:string;expectedVersion:number;requestId:string}){
    return this.prisma.$transaction(async tx=>{const values=[input.magnesiumTargetMg,input.ironTargetMg,input.zincTargetMg,input.copperTargetUg,input.manganeseTargetMg,input.molybdenumTargetUg,input.seleniumTargetUg,input.seleniumUpperLevelUg,input.iodineTargetUg,input.iodineUpperLevelUg];const rows=input.expectedVersion===0
      ?await tx.$queryRawUnsafe<Row[]>(`INSERT INTO client_mineral_targets(client_id,magnesium_target_mg,iron_target_mg,zinc_target_mg,copper_target_ug,manganese_target_mg,molybdenum_target_ug,selenium_target_ug,selenium_upper_level_ug,iodine_target_ug,iodine_upper_level_ug,updated_by) VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::uuid) ON CONFLICT(client_id) DO NOTHING RETURNING ${columns}`,input.clientId,...values,input.updatedBy)
      :await tx.$queryRawUnsafe<Row[]>(`UPDATE client_mineral_targets SET magnesium_target_mg=$2,iron_target_mg=$3,zinc_target_mg=$4,copper_target_ug=$5,manganese_target_mg=$6,molybdenum_target_ug=$7,selenium_target_ug=$8,selenium_upper_level_ug=$9,iodine_target_ug=$10,iodine_upper_level_ug=$11,updated_by=$12::uuid,version=version+1,updated_at=now() WHERE client_id=$1::uuid AND version=$13 RETURNING ${columns}`,input.clientId,...values,input.updatedBy,input.expectedVersion);
      if(!rows[0])return null;await tx.$executeRaw`INSERT INTO audit_events(request_id,actor_user_id,actor_role,action,resource_type,client_id,decision,reason_code) VALUES(${input.requestId},${input.updatedBy}::uuid,'consultant','mineral_targets.save','client_mineral_targets',${input.clientId}::uuid,'SUCCESS','MINERAL_TARGETS_SAVED')`;return map(rows[0]);});
  }
}
