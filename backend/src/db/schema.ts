import {
    boolean,
    date,
    decimal,
    index,
    integer,
    jsonb,
    numeric,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// 1. Core Users & Authentication
// ---------------------------------------------------------------------------
export const users = pgTable(
    'users',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        name: text('name').notNull(),
        alias: text('alias').notNull(),
        email: text('email').notNull().unique(),
        passwordHash: text('password_hash'),
        avatarUrl: text('avatar_url').notNull().default('avatar-01'),
        nationality: text('nationality').notNull().default('Colombia'),
        countryCode: text('country_code').notNull().default('CO'),
        emailVerified: boolean('email_verified').default(false),
        currentStreak: integer('current_streak').notNull().default(0),
        maxStreak: integer('max_streak').notNull().default(0),
        lastActivityDate: date('last_activity_date'),
        totalXp: integer('total_xp').notNull().default(0),
        accuracyAvg: numeric('accuracy_avg', { precision: 5, scale: 2 }).notNull().default('0.00'),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index('users_email_idx').on(t.email),
    ]
);

export const accounts = pgTable(
    'accounts',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        provider: text('provider').notNull(), // 'google' | 'microsoft'
        providerUserId: text('provider_user_id').notNull(),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        expiresAt: timestamp('expires_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index('accounts_user_id_idx').on(t.userId),
        index('accounts_provider_idx').on(t.provider, t.providerUserId),
    ]
);

export const sessions = pgTable(
    'sessions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        refreshToken: text('refresh_token').notNull(),
        userAgent: text('user_agent'),
        ipAddress: text('ip_address'),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index('sessions_user_id_idx').on(t.userId),
        index('sessions_refresh_token_idx').on(t.refreshToken),
    ]
);

// ---------------------------------------------------------------------------
// 2. Training Learning Route & Pedagogy (José María Quetglas)
// ---------------------------------------------------------------------------
export const trainingLevels = pgTable(
    'training_levels',
    {
        id: varchar('id', { length: 50 }).primaryKey(), // e.g. 'level-1'
        orderIndex: integer('order_index').notNull(),
        name: varchar('name', { length: 100 }).notNull(),
        tag: varchar('tag', { length: 50 }).notNull(),
        subtitle: varchar('subtitle', { length: 150 }).notNull(),
        description: text('description').notNull(),
        color: varchar('color', { length: 20 }).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index('training_levels_order_idx').on(t.orderIndex)]
);

export const trainingNodes = pgTable(
    'training_nodes',
    {
        id: varchar('id', { length: 80 }).primaryKey(), // e.g. 'l1-day-1'
        levelId: varchar('level_id', { length: 50 })
            .notNull()
            .references(() => trainingLevels.id, { onDelete: 'cascade' }),
        dayNumber: integer('day_number').notNull(),
        title: varchar('title', { length: 150 }).notNull(),
        subtitle: varchar('subtitle', { length: 255 }).notNull(),
        defaultStatus: varchar('default_status', { length: 20 }).notNull().default('locked'),
        isBoss: boolean('is_boss').notNull().default(false),
        xp: integer('xp').notNull().default(100),
        orderIndex: integer('order_index').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index('training_nodes_level_idx').on(t.levelId),
        index('training_nodes_order_idx').on(t.orderIndex),
    ]
);

export const trainingNodePositions = pgTable(
    'training_node_positions',
    {
        id: varchar('id', { length: 80 }).primaryKey(),
        nodeId: varchar('node_id', { length: 80 })
            .notNull()
            .references(() => trainingNodes.id, { onDelete: 'cascade' }),
        name: varchar('name', { length: 150 }).notNull(),
        category: varchar('category', { length: 80 }).notNull(),
        hint: text('hint'),
        difficulty: integer('difficulty').notNull().default(3),
        whitePos: jsonb('white_pos').notNull(),
        yellowPos: jsonb('yellow_pos').notNull(),
        redPos: jsonb('red_pos').notNull(),
        trajectory: jsonb('trajectory'),
        orderIndex: integer('order_index').notNull().default(0),
    },
    (t) => [index('node_positions_node_idx').on(t.nodeId)]
);

export const userNodeProgress = pgTable(
    'user_node_progress',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        nodeId: varchar('node_id', { length: 80 })
            .notNull()
            .references(() => trainingNodes.id, { onDelete: 'cascade' }),
        status: varchar('status', { length: 20 }).notNull().default('locked'), // 'completed' | 'active' | 'locked'
        stars: integer('stars').notNull().default(0),
        completedCount: integer('completed_count').notNull().default(0),
        bestAccuracy: numeric('best_accuracy', { precision: 5, scale: 2 }).notNull().default('0.00'),
        lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        uniqueIndex('user_node_unique_idx').on(t.userId, t.nodeId),
        index('user_progress_user_idx').on(t.userId),
        index('user_progress_node_idx').on(t.nodeId),
    ]
);

// ---------------------------------------------------------------------------
// 3. Billiard Classical Systems
// ---------------------------------------------------------------------------
export const billiardSystems = pgTable(
    'billiard_systems',
    {
        id: varchar('id', { length: 60 }).primaryKey(),
        name: varchar('name', { length: 100 }).notNull(),
        category: varchar('category', { length: 80 }).notNull(),
        formula: varchar('formula', { length: 150 }).notNull(),
        description: text('description').notNull(),
        difficulty: integer('difficulty').notNull().default(3),
        defaultBalls: jsonb('default_balls').notNull(),
        defaultTrajectory: jsonb('default_trajectory'),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index('billiard_systems_cat_idx').on(t.category)]
);

// ---------------------------------------------------------------------------
// 4. Session History & Snapshots
// ---------------------------------------------------------------------------
export const trainingSessionHistory = pgTable(
    'training_session_history',
    {
        id: varchar('id', { length: 100 }).primaryKey(),
        userId: varchar('user_id', { length: 100 }).notNull().default('guest'),
        totalTarget: integer('total_target').notNull().default(0),
        totalHits: integer('total_hits').notNull().default(0),
        accuracy: integer('accuracy').notNull().default(0),
        positionsCount: integer('positions_count').notNull().default(0),
        details: jsonb('details'),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index('session_history_user_idx').on(t.userId)]
);

export const tableSnapshot = pgTable('table_snapshots', {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    sourceImageUrl: text('source_image_url'),
});

export const ballPosition = pgTable('ball_positions', {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotId: uuid('snapshot_id')
        .notNull()
        .references(() => tableSnapshot.id, { onDelete: 'cascade' }),
    ballLabel: text('ball_label').notNull(),
    posX: decimal('pos_x', { precision: 5, scale: 4 }).notNull(),
    posY: decimal('pos_y', { precision: 5, scale: 4 }).notNull(),
});

// ---------------------------------------------------------------------------
// 5. Billiard Shot Catalog (Multilingual ES / EN / KO)
// ---------------------------------------------------------------------------
export const shotCatalog = pgTable(
    'shot_catalog',
    {
        id: integer('id').primaryKey(),
        externalId: integer('external_id').notNull().unique(),
        sourceType: text('source_type').notNull().default('analysis'),
        nameEs: text('name_es').notNull(),
        nameEn: text('name_en'),
        nameKo: text('name_ko'),
        category: text('category').notNull(),
        playerFirstName: text('player_first_name'),
        playerLastName: text('player_last_name'),
        playerNationality: text('player_nationality'),
        clubName: text('club_name'),
        description: text('description'),
        descriptionEs: text('description_es'),
        descriptionEn: text('description_en'),
        descriptionKo: text('description_ko'),
        tips: text('tips'),
        tipsEs: text('tips_es'),
        tipsEn: text('tips_en'),
        tipsKo: text('tips_ko'),
        cueBallX: decimal('cue_ball_x', { precision: 8, scale: 4 }).notNull(),
        cueBallY: decimal('cue_ball_y', { precision: 8, scale: 4 }).notNull(),
        objectBall1X: decimal('object_ball_1_x', { precision: 8, scale: 4 }).notNull(),
        objectBall1Y: decimal('object_ball_1_y', { precision: 8, scale: 4 }).notNull(),
        objectBall2X: decimal('object_ball_2_x', { precision: 8, scale: 4 }).notNull(),
        objectBall2Y: decimal('object_ball_2_y', { precision: 8, scale: 4 }).notNull(),
        cueBallLabel: text('cue_ball_label').notNull().default('white'),
        ballChoice: integer('ball_choice').notNull().default(1),
        ballThickness: decimal('ball_thickness', { precision: 6, scale: 3 }).notNull(),
        railSpeed: integer('rail_speed').notNull().default(2),
        rotation: decimal('rotation', { precision: 8, scale: 3 }),
        effectX: decimal('effect_x', { precision: 6, scale: 4 }),
        effectY: decimal('effect_y', { precision: 6, scale: 4 }),
        powerLevel: integer('power_level').notNull().default(2),
        cueBallTrajectory: text('cue_ball_trajectory').notNull(),
        objectBall1Trajectory: text('object_ball_1_trajectory'),
        objectBall2Trajectory: text('object_ball_2_trajectory'),
        cueStickTrajectory: text('cue_stick_trajectory'),
        isDifficult: boolean('is_difficult').default(false),
        isPosition: boolean('is_position').default(false),
        isDefense: boolean('is_defense').default(false),
        isAvoidKiss: boolean('is_avoid_kiss').default(false),
        hasAnalysis: boolean('has_analysis').default(false),
        youtubeUrl: text('youtube_url'),
        thumbnailUrl: text('thumbnail_url'),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index('idx_shot_catalog_category').on(t.category),
        index('idx_shot_catalog_external').on(t.externalId),
        index('idx_shot_catalog_player').on(t.playerLastName),
    ]
);
