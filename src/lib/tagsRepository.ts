import { randomUUID } from "node:crypto";
import { type Db, MongoServerError } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
  hasDuplicateTagName,
  isTagCategory,
  MAX_TAG_DESCRIPTION_LENGTH,
  MAX_TAG_NAME_LENGTH,
  normalizeTagText,
  PRESET_TAG_ROWS,
} from "@/lib/tags/config";
import type { TagCategory, TagRow, WorkspaceCustomTag } from "@/types/tags";

const DB_NAME = "thesetterapp";
const WORKSPACE_TAGS_COLLECTION = "workspace_tags";
let tagsIndexesReady = false;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeTagId(value: string): string {
  return value.trim();
}

function formatTimestamp(value: Date): string {
  return value.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function mapTagDocumentToRow(tag: WorkspaceCustomTag): TagRow {
  return {
    id: tag.id,
    name: tag.name,
    category: tag.category,
    description: tag.description,
    source: tag.source,
    inboxStatus: tag.inboxStatus,
    createdBy: tag.createdByLabel,
    createdAt: formatTimestamp(tag.createdAt),
  };
}

async function ensureTagIndexes(db: Db): Promise<void> {
  if (tagsIndexesReady) return;

  const collection = db.collection<WorkspaceCustomTag>(
    WORKSPACE_TAGS_COLLECTION,
  );
  await Promise.allSettled([
    collection.createIndex(
      { workspaceOwnerEmail: 1, normalizedName: 1 },
      { unique: true, name: "workspace_tags_unique_name_per_workspace" },
    ),
    collection.createIndex(
      { workspaceOwnerEmail: 1, createdAt: -1 },
      { name: "workspace_tags_by_workspace_created_at" },
    ),
  ]);

  tagsIndexesReady = true;
}

export class WorkspaceTagRepositoryError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function validateTagPayload(input: {
  name: string;
  category: TagCategory;
  description: string;
}) {
  const normalizedName = normalizeTagText(input.name);
  if (!normalizedName) {
    throw new WorkspaceTagRepositoryError(
      "invalid_name",
      "Tag name is required.",
      400,
    );
  }

  if (normalizedName.length > MAX_TAG_NAME_LENGTH) {
    throw new WorkspaceTagRepositoryError(
      "invalid_name_length",
      `Tag name must be ${MAX_TAG_NAME_LENGTH} characters or fewer.`,
      400,
    );
  }

  if (!isTagCategory(input.category)) {
    throw new WorkspaceTagRepositoryError(
      "invalid_category",
      "Invalid tag category.",
      400,
    );
  }

  const normalizedDescription = normalizeTagText(input.description);
  if (normalizedDescription.length > MAX_TAG_DESCRIPTION_LENGTH) {
    throw new WorkspaceTagRepositoryError(
      "invalid_description_length",
      `Description must be ${MAX_TAG_DESCRIPTION_LENGTH} characters or fewer.`,
      400,
    );
  }

  if (hasDuplicateTagName(normalizedName, PRESET_TAG_ROWS)) {
    throw new WorkspaceTagRepositoryError(
      "reserved_name",
      "Tag name already exists in preset tags.",
      409,
    );
  }

  return {
    normalizedName,
    normalizedDescription,
  };
}

export async function listWorkspaceCustomTags(
  workspaceOwnerEmail: string,
): Promise<TagRow[]> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(workspaceOwnerEmail);

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureTagIndexes(db);

  const collection = db.collection<WorkspaceCustomTag>(
    WORKSPACE_TAGS_COLLECTION,
  );
  const rows = await collection
    .find({ workspaceOwnerEmail: normalizedWorkspaceOwnerEmail })
    .sort({ createdAt: -1 })
    .toArray();

  return rows.map(mapTagDocumentToRow);
}

export async function listWorkspaceAssignableTags(
  workspaceOwnerEmail: string,
): Promise<TagRow[]> {
  const customTags = await listWorkspaceCustomTags(workspaceOwnerEmail);
  return [...PRESET_TAG_ROWS, ...customTags];
}

export async function createWorkspaceCustomTag(input: {
  workspaceOwnerEmail: string;
  name: string;
  category: TagCategory;
  description: string;
  createdByEmail: string;
  createdByLabel?: string;
}): Promise<TagRow> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(
    input.workspaceOwnerEmail,
  );
  const normalizedCreatedByEmail = normalizeEmail(input.createdByEmail);
  const normalizedCreatedByLabel = normalizeTagText(input.createdByLabel || "");
  const { normalizedName, normalizedDescription } = validateTagPayload({
    name: input.name,
    category: input.category,
    description: input.description,
  });

  const now = new Date();
  const tag: WorkspaceCustomTag = {
    id: randomUUID(),
    workspaceOwnerEmail: normalizedWorkspaceOwnerEmail,
    normalizedName: normalizedName.toLowerCase(),
    name: normalizedName,
    category: input.category,
    description: normalizedDescription || "No description added",
    source: "Custom",
    inboxStatus: "Not wired yet",
    createdByEmail: normalizedCreatedByEmail,
    createdByLabel: normalizedCreatedByLabel || normalizedCreatedByEmail,
    createdAt: now,
    updatedAt: now,
  };

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureTagIndexes(db);

  const collection = db.collection<WorkspaceCustomTag>(
    WORKSPACE_TAGS_COLLECTION,
  );
  try {
    await collection.insertOne(tag);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new WorkspaceTagRepositoryError(
        "duplicate_tag",
        "Tag name already exists.",
        409,
      );
    }
    throw error;
  }

  return mapTagDocumentToRow(tag);
}

export async function updateWorkspaceCustomTag(input: {
  workspaceOwnerEmail: string;
  tagId: string;
  name: string;
  category: TagCategory;
  description: string;
}): Promise<TagRow> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(
    input.workspaceOwnerEmail,
  );
  const normalizedTagId = normalizeTagId(input.tagId);
  if (!normalizedTagId) {
    throw new WorkspaceTagRepositoryError(
      "invalid_tag_id",
      "Invalid tag id.",
      400,
    );
  }

  const { normalizedName, normalizedDescription } = validateTagPayload({
    name: input.name,
    category: input.category,
    description: input.description,
  });

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureTagIndexes(db);

  const collection = db.collection<WorkspaceCustomTag>(
    WORKSPACE_TAGS_COLLECTION,
  );
  const currentTag = await collection.findOne({
    id: normalizedTagId,
    workspaceOwnerEmail: normalizedWorkspaceOwnerEmail,
  });
  if (!currentTag) {
    throw new WorkspaceTagRepositoryError(
      "tag_not_found",
      "Tag not found.",
      404,
    );
  }

  try {
    await collection.updateOne(
      {
        id: normalizedTagId,
        workspaceOwnerEmail: normalizedWorkspaceOwnerEmail,
      },
      {
        $set: {
          normalizedName: normalizedName.toLowerCase(),
          name: normalizedName,
          category: input.category,
          description: normalizedDescription || "No description added",
          updatedAt: new Date(),
        },
      },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new WorkspaceTagRepositoryError(
        "duplicate_tag",
        "Tag name already exists.",
        409,
      );
    }
    throw error;
  }

  const updatedTag = await collection.findOne({
    id: normalizedTagId,
    workspaceOwnerEmail: normalizedWorkspaceOwnerEmail,
  });
  if (!updatedTag) {
    throw new WorkspaceTagRepositoryError(
      "tag_not_found",
      "Tag not found.",
      404,
    );
  }

  return mapTagDocumentToRow(updatedTag);
}

export async function deleteWorkspaceCustomTag(input: {
  workspaceOwnerEmail: string;
  tagId: string;
}): Promise<void> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(
    input.workspaceOwnerEmail,
  );
  const normalizedTagId = normalizeTagId(input.tagId);
  if (!normalizedTagId) {
    throw new WorkspaceTagRepositoryError(
      "invalid_tag_id",
      "Invalid tag id.",
      400,
    );
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureTagIndexes(db);

  const collection = db.collection<WorkspaceCustomTag>(
    WORKSPACE_TAGS_COLLECTION,
  );
  const result = await collection.deleteOne({
    id: normalizedTagId,
    workspaceOwnerEmail: normalizedWorkspaceOwnerEmail,
  });
  if (result.deletedCount === 0) {
    throw new WorkspaceTagRepositoryError(
      "tag_not_found",
      "Tag not found.",
      404,
    );
  }
}
