import { Injectable } from '@nestjs/common'

export abstract class RitualClock {
  abstract now(): Date
}

@Injectable()
export class SystemRitualClock extends RitualClock {
  now() { return new Date() }
}
