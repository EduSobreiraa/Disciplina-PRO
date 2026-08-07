import { Injectable } from '@nestjs/common'

export abstract class MissionsClock { abstract now(): Date }

@Injectable()
export class SystemMissionsClock extends MissionsClock { now() { return new Date() } }
