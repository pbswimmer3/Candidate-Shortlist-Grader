interface RawExperience {
  companyName: string | null;
  companySize: string | null;
  companyIndustry: string | null;
  title: string | null;
  jobDescription: string | null;
  jobStartedOn: string | null;
  jobEndedOn: string | null;
  jobStillWorking: boolean | null;
  jobLocation: string | null;
  employmentType: string | null;
  logo: string | null;
  [key: string]: unknown;
}

interface RawEducation {
  title: string | null;
  subtitle: string | null;
  period?: { startedOn?: string; endedOn?: string };
  [key: string]: unknown;
}

interface RawSkill {
  title: string | null;
  [key: string]: unknown;
}

interface RawCertificate {
  title: string | null;
  subtitle: string | null;
  [key: string]: unknown;
}

interface RawProject {
  title: string | null;
  description: string | null;
  [key: string]: unknown;
}

interface RawAward {
  title: string | null;
  [key: string]: unknown;
}

interface RawProfile {
  fullName?: string;
  linkedinUrl?: string;
  linkedinPublicUrl?: string;
  headline?: string;
  about?: string;
  addressWithCountry?: string;
  addressWithoutCountry?: string;
  jobTitle?: string;
  companyName?: string;
  companySize?: string;
  companyIndustry?: string;
  currentJobDuration?: string;
  currentJobDurationInYrs?: number;
  jobStartedOn?: string;
  isJobSeeker?: boolean;
  isCurrentlyEmployed?: boolean;
  totalExperienceYears?: number;
  firstRoleYear?: number;
  experiencesCount?: number;
  experiences?: RawExperience[];
  educations?: RawEducation[];
  skills?: RawSkill[];
  topSkillsByEndorsements?: string[];
  connections?: number;
  followers?: number;
  licenseAndCertificates?: RawCertificate[];
  projects?: RawProject[];
  honorsAndAwards?: RawAward[];
  [key: string]: unknown;
}

export interface NormalizedExperience {
  companyName: string;
  companySize: string | null;
  companyIndustry: string | null;
  title: string | null;
  jobDescription: string | null;
  jobStartedOn: string | null;
  jobEndedOn: string | null;
  jobStillWorking: boolean | null;
  jobLocation: string | null;
  employmentType: string | null;
}

export interface NormalizedProfile {
  fullName: string;
  linkedinUrl: string | null;
  linkedinPublicUrl: string | null;
  headline: string | null;
  about: string | null;
  addressWithCountry: string | null;
  addressWithoutCountry: string | null;
  jobTitle: string | null;
  companyName: string | null;
  companySize: string | null;
  companyIndustry: string | null;
  currentJobDuration: string | null;
  currentJobDurationInYrs: number | null;
  jobStartedOn: string | null;
  isJobSeeker: boolean;
  isCurrentlyEmployed: boolean;
  totalExperienceYears: number | null;
  firstRoleYear: number | null;
  experiencesCount: number;
  experiences: NormalizedExperience[];
  educations: { title: string | null; subtitle: string | null; period: { startedOn?: string; endedOn?: string } }[];
  skills: { title: string }[];
  topSkillsByEndorsements: string[];
  connections: number | null;
  followers: number | null;
  licenseAndCertificates: { title: string | null; subtitle: string | null }[];
  projects: { title: string | null; description: string | null }[];
  honorsAndAwards: { title: string | null }[];
}

function resolveCompanyName(experience: RawExperience): string {
  if (experience.companyName) return experience.companyName;

  if (experience.logo) {
    const match = experience.logo.match(/\/([^/]+?)_logo/);
    if (match) {
      return match[1]
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  return "Unknown Company";
}

export function normalizeProfile(raw: RawProfile): NormalizedProfile {
  const experiences: NormalizedExperience[] = (raw.experiences || []).map((exp) => ({
    companyName: resolveCompanyName(exp),
    companySize: exp.companySize || null,
    companyIndustry: exp.companyIndustry || null,
    title: exp.title || null,
    jobDescription: exp.jobDescription || null,
    jobStartedOn: exp.jobStartedOn || null,
    jobEndedOn: exp.jobEndedOn || null,
    jobStillWorking: exp.jobStillWorking ?? null,
    jobLocation: exp.jobLocation || null,
    employmentType: exp.employmentType || null,
  }));

  const educations = (raw.educations || []).map((edu) => ({
    title: edu.title || null,
    subtitle: edu.subtitle || null,
    period: {
      startedOn: edu.period?.startedOn,
      endedOn: edu.period?.endedOn,
    },
  }));

  const skills = (raw.skills || [])
    .filter((s) => s.title)
    .map((s) => ({ title: s.title! }));

  const licenseAndCertificates = (raw.licenseAndCertificates || []).map((c) => ({
    title: c.title || null,
    subtitle: c.subtitle || null,
  }));

  const projects = (raw.projects || [])
    .filter((p) => p.title || p.description)
    .map((p) => ({
      title: p.title || null,
      description: p.description || null,
    }));

  const honorsAndAwards = (raw.honorsAndAwards || [])
    .filter((a) => a.title)
    .map((a) => ({ title: a.title || null }));

  return {
    fullName: raw.fullName || "Unknown",
    linkedinUrl: raw.linkedinUrl || null,
    linkedinPublicUrl: raw.linkedinPublicUrl || null,
    headline: raw.headline || null,
    about: raw.about || null,
    addressWithCountry: raw.addressWithCountry || null,
    addressWithoutCountry: raw.addressWithoutCountry || null,
    jobTitle: raw.jobTitle || null,
    companyName: raw.companyName || null,
    companySize: raw.companySize || null,
    companyIndustry: raw.companyIndustry || null,
    currentJobDuration: raw.currentJobDuration || null,
    currentJobDurationInYrs: raw.currentJobDurationInYrs ?? null,
    jobStartedOn: raw.jobStartedOn || null,
    isJobSeeker: raw.isJobSeeker ?? false,
    isCurrentlyEmployed: raw.isCurrentlyEmployed ?? true,
    totalExperienceYears: raw.totalExperienceYears ?? null,
    firstRoleYear: raw.firstRoleYear ?? null,
    experiencesCount: raw.experiencesCount ?? (raw.experiences?.length || 0),
    experiences,
    educations,
    skills,
    topSkillsByEndorsements: raw.topSkillsByEndorsements || [],
    connections: raw.connections ?? null,
    followers: raw.followers ?? null,
    licenseAndCertificates,
    projects: projects.length > 0 ? projects : [],
    honorsAndAwards: honorsAndAwards.length > 0 ? honorsAndAwards : [],
  };
}
