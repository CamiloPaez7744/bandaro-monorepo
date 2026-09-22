declare module '@tabler/icons-react-native/*' {
    import type { ComponentType } from 'react';
    import type { SvgProps } from 'react-native-svg';

    export interface IconProps extends SvgProps {
        size?: number | string;
        color?: string;
        strokeWidth?: number | string;
    }

    const IconComponent: ComponentType<IconProps>;
    export default IconComponent;
}
