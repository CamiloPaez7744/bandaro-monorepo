import { decimal, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tableSnapshot = pgTable('table_snapshots', {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
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
