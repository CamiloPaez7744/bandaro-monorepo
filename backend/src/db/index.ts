import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;
const isRemoteDb =
    connectionString?.includes('sslmode=require') ||
    connectionString?.includes('.neon.tech') ||
    connectionString?.includes('.supabase.co') ||
    process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
    connectionString,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
