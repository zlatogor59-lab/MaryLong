import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { AppError, unavailable } from '../common/app-error';
import { AssignmentRepository } from './assignment.repository';
import { PayloadCryptoService } from './payload-crypto.service';
import { SubmissionStore } from './submission.store';

type FieldDefinition = { key:string; label:string; index:number };
type SectionDefinition = { key:string; title:string; fields:FieldDefinition[] };
type AnalysisField = { key:string; label:string; value:string };
type AnalysisSection = { key:string; title:string; fields:AnalysisField[] };

// Explicit allowlist for v2/v3. Direct identifiers (including optional email), consent, referral and uploaded files are intentionally absent.
const V2_SECTIONS:SectionDefinition[] = [
  {key:'profile',title:'Исходные данные',fields:[
    {key:'height_cm',label:'Рост, см',index:3},{key:'weight_kg',label:'Масса, кг',index:4},{key:'age_years',label:'Возраст, лет',index:5},
    {key:'sex',label:'Пол',index:50},{key:'waist_cm',label:'Окружность талии, см',index:39},{key:'hips_cm',label:'Окружность бёдер, см',index:40},{key:'calf_cm',label:'Окружность голени, см',index:47},
  ]},
  {key:'goals',title:'Цели и контекст',fields:[
    {key:'main_goal',label:'Главная цель',index:13},{key:'goal_details',label:'Подробнее о цели',index:51},{key:'concerns',label:'Что беспокоит',index:7},
    {key:'excluded_foods',label:'Исключённые продукты',index:8},{key:'habits',label:'Пищевые привычки',index:9},{key:'wishes',label:'Пожелания',index:10},
  ]},
  {key:'routine',title:'Режим и активность',fields:[
    {key:'activity',label:'Физическая активность',index:11},{key:'strength_sessions',label:'Силовых тренировок в неделю',index:52},
    {key:'wake_time',label:'Время пробуждения',index:53},{key:'bed_time',label:'Время отхода ко сну',index:14},{key:'weight_change',label:'Изменение веса за месяц',index:12},
  ]},
  {key:'food_day',title:'Питание за день',fields:[
    {key:'breakfast',label:'Завтрак',index:45},{key:'snack_1',label:'Первый перекус',index:25},{key:'lunch',label:'Обед',index:28},
    {key:'snack_2',label:'Второй перекус',index:31},{key:'dinner',label:'Ужин',index:34},{key:'late_snack',label:'Перекус перед сном',index:37},
    {key:'fats',label:'Жиры и масла',index:71},{key:'salt',label:'Добавленная соль',index:72},{key:'sauces',label:'Соусы и заправки',index:73},
    {key:'drinks',label:'Напитки',index:74},{key:'extras',label:'Небольшие перекусы и добавки',index:75},
  ]},
  {key:'wellbeing',title:'Самочувствие — ответы клиента',fields:[
    {key:'systems',label:'Беспокоящие системы организма',index:41},{key:'appetite_peak',label:'Пик аппетита',index:42},{key:'energy_mood',label:'Энергия и настроение',index:43},
    {key:'confirmed_conditions',label:'Подтверждённые состояния',index:59},{key:'conditions_notes',label:'Состояния своими словами',index:60},
    {key:'medicines',label:'Лекарства',index:61},{key:'doctor_guidance',label:'Рекомендации и ограничения врача',index:62},
    {key:'allergies',label:'Аллергии и непереносимости',index:63},{key:'supplements',label:'Пищевые добавки',index:65},{key:'warning_symptoms',label:'Тревожные симптомы из списка',index:69},
  ]},
];

@Injectable()
export class SubmissionAnalysisService {
  constructor(private readonly store:SubmissionStore,private readonly assignments:AssignmentRepository,private readonly policy:AuthorizationPolicy,
    private readonly crypto:PayloadCryptoService,private readonly audit:AuditService) {}

  async get(id:string,clientId:string,user:AuthenticatedUser,requestId:string) {
    this.policy.requireRole(user,'consultant');
    const record=await this.store.findById(id);
    if(!record || record.clientId!==clientId) throw unavailable('SUBMISSION_NOT_FOUND');
    this.policy.requireActiveAssignment(user,await this.assignments.activeConsultant(record.clientId));
    if(record.status!=='accepted') throw unavailable('SUBMISSION_NOT_ACCEPTED');
    if(record.schemaId!=='forms_v2_76_columns'&&record.schemaId!=='forms_v3_77_columns') throw new AppError('ANALYSIS_SCHEMA_UNSUPPORTED',HttpStatus.UNPROCESSABLE_ENTITY);
    let plaintext:Uint8Array;
    try { plaintext=await this.crypto.decrypt(record.payloadCiphertext); }
    catch { throw new AppError('PAYLOAD_INTEGRITY_FAILED',HttpStatus.CONFLICT); }
    if(createHash('sha256').update(plaintext).digest('hex')!==record.payloadHash) throw new AppError('PAYLOAD_INTEGRITY_FAILED',HttpStatus.CONFLICT);
    let values:unknown;
    try { values=JSON.parse(Buffer.from(plaintext).toString('utf8')); } catch { throw new AppError('PAYLOAD_INVALID',HttpStatus.CONFLICT); }
    const expectedWidth=record.schemaId==='forms_v3_77_columns'?77:76;
    if(!Array.isArray(values)||values.length!==expectedWidth) throw new AppError('PAYLOAD_INVALID',HttpStatus.CONFLICT);
    const sections:AnalysisSection[]=V2_SECTIONS.map(section=>({...section,fields:section.fields.map(field=>({...field,value:normalise(values[field.index])}))
      .filter((field):field is FieldDefinition&{value:string}=>field.value!==null)}))
      .filter(section=>section.fields.length>0).map(section=>({key:section.key,title:section.title,fields:section.fields.map(({index:_,...field})=>field)}));
    const anthropometrics=buildAnthropometricSection(values);
    if(anthropometrics) sections.splice(Math.min(1,sections.length),0,anthropometrics);
    await this.audit.record({requestId,actorUserId:user.id,actorRole:user.role,action:'submission.analysis.read',resourceType:'form_submission',resourceId:id,
      clientId:record.clientId,decision:'ALLOW',reasonCode:'SUBMISSION_ANALYSIS_READ'});
    return {submission_id:id,schema_id:record.schemaId,
      disclaimer:'Расчётные показатели являются скрининговыми ориентирами, а не диагнозом или обязательной целью. Индивидуальную цель консультант определяет с учётом возраста, состава тела, состояния здоровья и самочувствия.',sections};
  }
}

function buildAnthropometricSection(values:unknown[]):AnalysisSection|null {
  const heightCm=parseMeasurement(values[3]);
  const weightKg=parseMeasurement(values[4]);
  const waistCm=parseMeasurement(values[39]);
  const hipsCm=parseMeasurement(values[40]);
  const sex=normalise(values[50])?.toLowerCase()??'';
  const fields:AnalysisField[]=[];

  if(heightCm!==null&&weightKg!==null&&heightCm>=100&&heightCm<=250&&weightKg>=20&&weightKg<=500) {
    const heightM=heightCm/100;
    const heightSquared=heightM*heightM;
    fields.push(
      {key:'bmi',label:'Текущий индекс массы тела',value:`${formatNumber(weightKg/heightSquared,1)} кг/м²`},
      {key:'reference_weight_range',label:'Референсный диапазон веса (ИМТ 18,5–24,9)',value:formatRange(18.5*heightSquared,24.9*heightSquared)},
      {key:'optimal_weight_guide',label:'Оптимальный ориентир веса (ИМТ 20–22)',value:formatRange(20*heightSquared,22*heightSquared)},
    );
  }

  if(waistCm!==null&&hipsCm!==null&&waistCm>=30&&waistCm<=250&&hipsCm>=30&&hipsCm<=300) {
    fields.push({key:'waist_hip_ratio',label:'Отношение талии к бёдрам',value:formatNumber(waistCm/hipsCm,2)});
    if(sex.includes('жен')) fields.push({key:'waist_hip_guide',label:'Ориентир для женщин',value:'Оптимальный ориентир: менее 0,80; порог повышенного риска: 0,85 и выше'});
    else if(sex.includes('муж')) fields.push({key:'waist_hip_guide',label:'Ориентир для мужчин',value:'Порог повышенного риска: 0,90 и выше'});
  }

  return fields.length?{key:'anthropometrics',title:'Расчётные показатели',fields}:null;
}

function parseMeasurement(value:unknown):number|null {
  const text=normalise(value);
  if(!text)return null;
  const parsed=Number(text.replace(',','.'));
  return Number.isFinite(parsed)?parsed:null;
}

function formatNumber(value:number,digits:number):string {
  return value.toLocaleString('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits});
}

function formatRange(min:number,max:number):string {
  return `${formatNumber(min,1)}–${formatNumber(max,1)} кг`;
}

function normalise(value:unknown):string|null {
  if(value===null||value===undefined)return null;
  const text=String(value).replace(/\s+/g,' ').trim();
  return text ? text.slice(0,4000) : null;
}
