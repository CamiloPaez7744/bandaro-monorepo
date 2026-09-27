import { IconHome, IconBook, IconClock, IconBarbell, IconUser, IconChevronRight, IconChevronLeft } from '@tabler/icons-react-native';
import { Link, usePathname } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';

type SidebarHref = '/' | '/(tabs)/catalog' | '/(tabs)/training' | '/(tabs)/history' | '/(tabs)/profile';

const NAV_ITEMS: ReadonlyArray<{ href: SidebarHref; icon: 'home' | 'book' | 'barbell' | 'time' | 'person'; key: 'tabs.home' | 'tabs.catalog' | 'tabs.training' | 'tabs.history' | 'tabs.profile' }> = [
    { href: '/', icon: 'home', key: 'tabs.home' },
    { href: '/(tabs)/catalog', icon: 'book', key: 'tabs.catalog' },
    { href: '/(tabs)/training', icon: 'barbell', key: 'tabs.training' },
    { href: '/(tabs)/history', icon: 'time', key: 'tabs.history' },
    { href: '/(tabs)/profile', icon: 'person', key: 'tabs.profile' },
];

type WebSidebarProps = Readonly<{
    collapsed: boolean;
    onToggleCollapsed: () => void;
}>;

function normalizePath(path: string) {
    const normalized = path.replace('/(tabs)', '').replace('/index', '/');
    return normalized === '' ? '/' : normalized;
}

function isActivePath(pathname: string, href: SidebarHref) {
    const currentPath = normalizePath(pathname);
    const targetPath = normalizePath(href);

    if (targetPath === '/') {
        return currentPath === '/';
    }

    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

export function WebSidebar({ collapsed, onToggleCollapsed }: WebSidebarProps) {
    const pathname = usePathname();
    const { t } = useI18n();
    const palette = getPalette(useColorScheme());
    const styles = getStyles(palette);

    return (
        <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
            <View style={[styles.brandBlock, collapsed && styles.brandBlockCollapsed]}>
                <Image source={require('../assets/images/bandaro.png')} style={styles.brandLogo} resizeMode="cover" />
                {collapsed ? null : (
                    <View style={styles.brandCopy}>
                        <Text style={styles.brandTitle}>Bandaro</Text>
                        <Text style={styles.brandSubtitle}>Billiards lab</Text>
                    </View>
                )}
                <Pressable onPress={onToggleCollapsed} style={styles.collapseButton} accessibilityRole="button" accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                    {collapsed ? (
                        <IconChevronRight size={16} color={palette.muted} strokeWidth={2} />
                    ) : (
                        <IconChevronLeft size={16} color={palette.muted} strokeWidth={2} />
                    )}
                </Pressable>
            </View>

            <View style={styles.navList}>
                {NAV_ITEMS.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const navItemStyle = StyleSheet.flatten([styles.navItem, active ? styles.navItemActive : null]);
                    const iconMap: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
                        home: IconHome,
                        book: IconBook,
                        time: IconClock,
                        barbell: IconBarbell,
                        person: IconUser,
                    };
                    const IconComponent = iconMap[item.icon];
                    return (
                        <Link key={item.href} href={item.href} asChild>
                            <Pressable style={navItemStyle}>
                                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                                    <IconComponent size={18} color={active ? palette.primary : palette.muted} strokeWidth={2} />
                                </View>
                                {collapsed ? null : <Text style={[styles.navText, active && styles.navTextActive]}>{t(item.key)}</Text>}
                                {active ? <View style={styles.activeRail} /> : null}
                            </Pressable>
                        </Link>
                    );
                })}
            </View>

            {collapsed ? null : (
                <View style={styles.footerCard}>
                    <Text style={styles.footerTag}>Web view</Text>
                    <Text style={styles.footerTitle}>{t('sidebar.webFocus')}</Text>
                    <Text style={styles.footerText}>{t('sidebar.webDesc')}</Text>
                </View>
            )}
        </View>
    );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
    StyleSheet.create({
        sidebar: {
            width: 276,
            minHeight: '100%',
            backgroundColor: palette.background,
            borderRightWidth: 1,
            borderRightColor: palette.border,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.lg,
            gap: theme.spacing.lg,
        },
        sidebarCollapsed: {
            width: 84,
            paddingHorizontal: theme.spacing.sm,
        },
        brandBlock: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingBottom: theme.spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
        },
        brandBlockCollapsed: {
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 10,
        },
        brandLogo: {
            width: 42,
            height: 42,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: `${palette.primary}20`,
            backgroundColor: palette.card,
        },
        brandCopy: {
            flex: 1,
        },
        collapseButton: {
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
        },
        brandTitle: {
            color: palette.primary,
            fontSize: 16,
            fontWeight: '900',
            letterSpacing: 0.2,
        },
        brandSubtitle: {
            marginTop: 2,
            color: palette.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
        },
        navList: {
            gap: 8,
        },
        navItem: {
            minHeight: 56,
            borderRadius: 16,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            overflow: 'hidden',
        },
        navItemActive: {
            backgroundColor: `${palette.primary}12`,
            borderColor: `${palette.primary}20`,
        },
        iconWrap: {
            width: 28,
            height: 28,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.background,
        },
        iconWrapActive: {
            backgroundColor: `${palette.primary}14`,
        },
        navText: {
            flex: 1,
            color: palette.muted,
            fontSize: 14,
            fontWeight: '700',
        },
        navTextActive: {
            color: palette.text,
        },
        activeRail: {
            width: 4,
            height: '100%',
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: palette.primary,
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
        },
        footerCard: {
            marginTop: 'auto',
            borderRadius: 18,
            padding: 16,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            gap: 6,
        },
        footerTag: {
            color: palette.primary,
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1,
            textTransform: 'uppercase',
        },
        footerTitle: {
            color: palette.text,
            fontSize: 15,
            fontWeight: '900',
        },
        footerText: {
            color: palette.muted,
            fontSize: 12,
            lineHeight: 18,
        },
    });
