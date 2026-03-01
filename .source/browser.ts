// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"concepts.mdx": () => import("../content/docs/concepts.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "quick-start.mdx": () => import("../content/docs/quick-start.mdx?collection=docs"), "api/api-keys.mdx": () => import("../content/docs/api/api-keys.mdx?collection=docs"), "api/authentication.mdx": () => import("../content/docs/api/authentication.mdx?collection=docs"), "api/delivery.mdx": () => import("../content/docs/api/delivery.mdx?collection=docs"), "api/files.mdx": () => import("../content/docs/api/files.mdx?collection=docs"), "api/projects.mdx": () => import("../content/docs/api/projects.mdx?collection=docs"), "api/sign-read.mdx": () => import("../content/docs/api/sign-read.mdx?collection=docs"), "api/sign-upload.mdx": () => import("../content/docs/api/sign-upload.mdx?collection=docs"), "self-hosting/docker-compose.mdx": () => import("../content/docs/self-hosting/docker-compose.mdx?collection=docs"), "self-hosting/environment.mdx": () => import("../content/docs/self-hosting/environment.mdx?collection=docs"), "self-hosting/migrations.mdx": () => import("../content/docs/self-hosting/migrations.mdx?collection=docs"), }),
};
export default browserCollections;