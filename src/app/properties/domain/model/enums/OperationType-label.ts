import { OperationType } from './OperationType.enum';

export const OperationTypeLabel: Record<OperationType, string> = {
  [OperationType.SALE]: 'Venta',
  [OperationType.RENT]: 'Alquiler',
  [OperationType.BOTH]: 'Ambas',
}
