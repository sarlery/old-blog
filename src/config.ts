import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://sarlery.github.io",
  author: "Mh",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "多云转晴的博客",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerPage: 3,
};

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/sarlery",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
];
