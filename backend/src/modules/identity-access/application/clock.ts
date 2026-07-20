import { Injectable } from '@nestjs/common'

export abstract class Clock {
  abstract now(): Date
}

@Injectable()
export class SystemClock extends Clock {
  now() {
    return new Date()
  }
}
