import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Link from "next/link";

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <Link href="/" className="font-semibold text-base tracking-tight">
        contento
      </Link>
    ),
  },
  links: [
    {
      text: "Home",
      url: "/",
    },
    {
      text: "Admin UI",
      url: "/admin",
    },
    {
      text: "GitHub",
      url: "https://github.com/cesarrom/contento",
    },
  ],
};
