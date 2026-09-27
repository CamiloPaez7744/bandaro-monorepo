import { db } from './index.js';
import { sql } from 'drizzle-orm';

export async function runSchemaUpdates() {
    console.log('[db] Updating schema in PostgreSQL...');

    // 1. Extend users table with streak and stats
    await db.execute(sql`
        ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS max_streak integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_activity_date date,
            ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS accuracy_avg numeric(5, 2) NOT NULL DEFAULT 0.00;
    `);

    // 2. Training Levels (Quetglas Curriculum)
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS training_levels (
            id varchar(50) PRIMARY KEY,
            order_index integer NOT NULL,
            name varchar(100) NOT NULL,
            tag varchar(50) NOT NULL,
            subtitle varchar(150) NOT NULL,
            description text NOT NULL,
            color varchar(20) NOT NULL,
            created_at timestamptz DEFAULT now() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS training_levels_order_idx ON training_levels(order_index);
    `);

    // 3. Training Nodes (Daily Stations / Duolingo skill tree)
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS training_nodes (
            id varchar(80) PRIMARY KEY,
            level_id varchar(50) NOT NULL REFERENCES training_levels(id) ON DELETE CASCADE,
            day_number integer NOT NULL,
            title varchar(150) NOT NULL,
            subtitle varchar(255) NOT NULL,
            default_status varchar(20) DEFAULT 'locked' NOT NULL,
            is_boss boolean DEFAULT false NOT NULL,
            xp integer DEFAULT 100 NOT NULL,
            order_index integer NOT NULL,
            created_at timestamptz DEFAULT now() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS training_nodes_level_idx ON training_nodes(level_id);
        CREATE INDEX IF NOT EXISTS training_nodes_order_idx ON training_nodes(order_index);
    `);

    // 4. Training Node Positions (Table shot setups)
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS training_node_positions (
            id varchar(80) PRIMARY KEY,
            node_id varchar(80) NOT NULL REFERENCES training_nodes(id) ON DELETE CASCADE,
            name varchar(150) NOT NULL,
            category varchar(80) NOT NULL,
            hint text,
            difficulty integer DEFAULT 3 NOT NULL,
            white_pos jsonb NOT NULL,
            yellow_pos jsonb NOT NULL,
            red_pos jsonb NOT NULL,
            trajectory jsonb,
            order_index integer DEFAULT 0 NOT NULL
        );
        CREATE INDEX IF NOT EXISTS node_positions_node_idx ON training_node_positions(node_id);
    `);

    // 5. User Node Progress (Completed, Stars, Accuracy per node)
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_node_progress (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            node_id varchar(80) NOT NULL REFERENCES training_nodes(id) ON DELETE CASCADE,
            status varchar(20) DEFAULT 'locked' NOT NULL,
            stars integer DEFAULT 0 NOT NULL,
            completed_count integer DEFAULT 0 NOT NULL,
            best_accuracy numeric(5, 2) DEFAULT 0.00 NOT NULL,
            last_attempt_at timestamptz DEFAULT now() NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS user_node_unique_idx ON user_node_progress(user_id, node_id);
        CREATE INDEX IF NOT EXISTS user_progress_user_idx ON user_node_progress(user_id);
        CREATE INDEX IF NOT EXISTS user_progress_node_idx ON user_node_progress(node_id);
    `);

    // 6. Classical Billiard Systems
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS billiard_systems (
            id varchar(60) PRIMARY KEY,
            name varchar(100) NOT NULL,
            category varchar(80) NOT NULL,
            formula varchar(150) NOT NULL,
            description text NOT NULL,
            difficulty integer DEFAULT 3 NOT NULL,
            default_balls jsonb NOT NULL,
            default_trajectory jsonb,
            created_at timestamptz DEFAULT now() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS billiard_systems_cat_idx ON billiard_systems(category);
    `);

    // 7. User Favorite Shots
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_favorite_shots (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id varchar(100) NOT NULL DEFAULT 'guest',
            shot_id integer NOT NULL,
            created_at timestamptz DEFAULT now() NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS user_favorite_shots_user_shot_idx ON user_favorite_shots(user_id, shot_id);
        CREATE INDEX IF NOT EXISTS user_favorite_shots_user_idx ON user_favorite_shots(user_id);
        CREATE INDEX IF NOT EXISTS user_favorite_shots_shot_idx ON user_favorite_shots(shot_id);
    `);

    console.log('[db] Schema tables and indexes created successfully!');
}

if (process.argv[1]?.endsWith('run_schema.ts')) {
    runSchemaUpdates()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('[db] Error running schema updates:', err);
            process.exit(1);
        });
}
