import { SetMetadata } from '@nestjs/common'
import { PUBLIC_ROUTE } from './authentication.constants.js'

export const Public = () => SetMetadata(PUBLIC_ROUTE, true)
