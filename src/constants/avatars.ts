import type { ImageSourcePropType } from 'react-native';

export interface AvatarOption {
    key: string;
    label: string;
    asset: ImageSourcePropType;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
    { key: 'avatar-01', label: 'Avatar 1', asset: require('../../assets/images/avatars/avatar-01.png') },
    { key: 'avatar-02', label: 'Avatar 2', asset: require('../../assets/images/avatars/avatar-02.png') },
    { key: 'avatar-03', label: 'Avatar 3', asset: require('../../assets/images/avatars/avatar-03.png') },
    { key: 'avatar-04', label: 'Avatar 4', asset: require('../../assets/images/avatars/avatar-04.png') },
    { key: 'avatar-05', label: 'Avatar 5', asset: require('../../assets/images/avatars/avatar-05.png') },
    { key: 'avatar-06', label: 'Avatar 6', asset: require('../../assets/images/avatars/avatar-06.png') },
    { key: 'avatar-07', label: 'Avatar 7', asset: require('../../assets/images/avatars/avatar-07.png') },
    { key: 'avatar-08', label: 'Avatar 8', asset: require('../../assets/images/avatars/avatar-08.png') },
    { key: 'avatar-09', label: 'Avatar 9', asset: require('../../assets/images/avatars/avatar-09.png') },
    { key: 'avatar-10', label: 'Avatar 10', asset: require('../../assets/images/avatars/avatar-10.png') },
];

const AVATAR_BY_KEY = Object.fromEntries(AVATAR_OPTIONS.map((avatar) => [avatar.key, avatar])) as Record<string, AvatarOption>;

export function getAvatarOption(key?: string): AvatarOption | undefined {
    if (!key) {
        return undefined;
    }

    return AVATAR_BY_KEY[key];
}

export function getAvatarSource(key?: string): ImageSourcePropType {
    if (!key) {
        return AVATAR_OPTIONS[0].asset;
    }

    if (key.startsWith('http://') || key.startsWith('https://')) {
        return { uri: key };
    }

    return getAvatarOption(key)?.asset ?? AVATAR_OPTIONS[0].asset;
}
