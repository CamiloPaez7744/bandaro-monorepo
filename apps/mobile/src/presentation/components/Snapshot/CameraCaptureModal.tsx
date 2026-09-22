import { memo } from 'react';
import {
  TableVisionStudioModal,
  type TableVisionStudioModalProps,
} from './TableVisionStudioModal';

export type CameraCaptureModalProps = TableVisionStudioModalProps;

export const CameraCaptureModal = memo(TableVisionStudioModal);
export default CameraCaptureModal;
