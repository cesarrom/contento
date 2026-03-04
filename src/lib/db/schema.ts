import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  visibility: text("visibility").notNull().default("private"), // 'public' | 'private'
  bucketName: text("bucket_name").notNull(),
  allowedOrigins: text("allowed_origins").array().notNull().default([]),
  deliveryCacheEnabled: boolean("delivery_cache_enabled").notNull().default(true),
  deliveryCacheTtlSeconds: integer("delivery_cache_ttl_seconds").notNull().default(300),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(), // first 8 chars for UI display
  scopes: text("scopes").array().notNull().default(["read"]), // 'read' | 'write' | 'admin'
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const transformJobs = pgTable("transform_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sourcePath: text("source_path").notNull(),
  params: jsonb("params").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'done' | 'failed'
  outputPath: text("output_path"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  apiKeys: many(apiKeys),
  transformJobs: many(transformJobs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  project: one(projects, {
    fields: [apiKeys.projectId],
    references: [projects.id],
  }),
}));

export const transformJobsRelations = relations(transformJobs, ({ one }) => ({
  project: one(projects, {
    fields: [transformJobs.projectId],
    references: [projects.id],
  }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type TransformJob = typeof transformJobs.$inferSelect;
