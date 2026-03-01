// @ts-nocheck
import * as __fd_glob_15 from "../content/docs/self-hosting/migrations.mdx?collection=docs"
import * as __fd_glob_14 from "../content/docs/self-hosting/environment.mdx?collection=docs"
import * as __fd_glob_13 from "../content/docs/self-hosting/docker-compose.mdx?collection=docs"
import * as __fd_glob_12 from "../content/docs/api/sign-upload.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/api/sign-read.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/api/projects.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/api/files.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/api/delivery.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/api/authentication.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/api/api-keys.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/quick-start.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/index.mdx?collection=docs"
import * as __fd_glob_3 from "../content/docs/concepts.mdx?collection=docs"
import { default as __fd_glob_2 } from "../content/docs/self-hosting/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/api/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, "api/meta.json": __fd_glob_1, "self-hosting/meta.json": __fd_glob_2, }, {"concepts.mdx": __fd_glob_3, "index.mdx": __fd_glob_4, "quick-start.mdx": __fd_glob_5, "api/api-keys.mdx": __fd_glob_6, "api/authentication.mdx": __fd_glob_7, "api/delivery.mdx": __fd_glob_8, "api/files.mdx": __fd_glob_9, "api/projects.mdx": __fd_glob_10, "api/sign-read.mdx": __fd_glob_11, "api/sign-upload.mdx": __fd_glob_12, "self-hosting/docker-compose.mdx": __fd_glob_13, "self-hosting/environment.mdx": __fd_glob_14, "self-hosting/migrations.mdx": __fd_glob_15, });