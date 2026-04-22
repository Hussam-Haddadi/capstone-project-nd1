/** بيانات فريق المشروع — ضع الصور في `public/team/` وحدّث الروابط */

export type TeamLinkKind = "linkedin" | "github" | "x" | "web";

export type TeamLink = {
  kind: TeamLinkKind;
  /** اتركه فارغًا لإخفاء الأيقونة حتى تضيف الرابط */
  href: string;
  label: string;
};

export type TeamMember = {
  id: string;
  nameAr: string;
  /** مثل `/team/hosam.jpg` أو null لعرض الأحرف الأولى فقط */
  imageSrc: string | null;
  links: TeamLink[];
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "hosam",
    nameAr: "حسام حدادي",
    imageSrc: "/team/hosam.png",
    links: [
      {
        kind: "linkedin",
        href: "https://www.linkedin.com/in/hussam-hadadi-21921b34a?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
        label: "LinkedIn",
      },
      { kind: "github", href: "", label: "GitHub" },
    ],
  },
  {
    id: "abdulsalam",
    nameAr: "عبدالسلام الاحمري",
    imageSrc: "/team/abdulsalam.png",
    links: [
      {
        kind: "linkedin",
        href: "https://www.linkedin.com/in/abdulsalam-al-salm-630b8323a?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
        label: "LinkedIn",
      },
      { kind: "github", href: "", label: "GitHub" },
    ],
  },
  {
    id: "majed",
    nameAr: "ماجد النودلي",
    imageSrc: "/team/majed.png",
    links: [
      {
        kind: "linkedin",
        href: "https://www.linkedin.com/in/majid-alnodali-93654b362?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
        label: "LinkedIn",
      },
      { kind: "github", href: "", label: "GitHub" },
    ],
  },
  {
    id: "abdullah",
    nameAr: "عبدالله الفالح",
    imageSrc: "/team/abdullah.png",
    links: [
      {
        kind: "linkedin",
        href: "https://www.linkedin.com/in/abdullah-faleh-6557a22a7?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
        label: "LinkedIn",
      },
      { kind: "github", href: "", label: "GitHub" },
    ],
  },
];
