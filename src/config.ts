import type { Site, SocialObjects } from "./types";

const authorNickname = '多云转晴';

export const SITE: Site = {
  website: "https://sarlery.github.io",
  author: authorNickname,
  desc: `${authorNickname}的博客网站，分享前端、互联网技术、日常等相关话题`,
  title: `${authorNickname}的博客网站`,
  ogImage: "",
  lightAndDarkMode: true,
  /** 博客一页多少条（分页） */
  postPerPage: 6,
  email: '643360052@qq.com',
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
