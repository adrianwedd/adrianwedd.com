import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface CvData {
  jobTitle: string;
  knowsAbout: string[];
  occupationName: string;
}

const DEFAULTS: CvData = {
  jobTitle: 'Systems Builder & AI Safety Researcher',
  knowsAbout: ['AI Safety', 'Systems Analysis', 'Cybersecurity', 'Multi-agent Systems', 'Infrastructure Management'],
  occupationName: 'Systems Builder & AI Safety Researcher',
};

function loadCvData(): CvData {
  const cvPath = join(process.cwd(), 'src/data/base-cv.json');
  if (!existsSync(cvPath)) return DEFAULTS;
  try {
    const raw = JSON.parse(readFileSync(cvPath, 'utf8'));
    const pi = raw.personal_info ?? {};
    const skills: Array<{ name: string; tier: string }> = raw.skills ?? [];
    const primarySkills = skills
      .filter((s) => s.tier === 'Primary')
      .map((s) => s.name)
      .slice(0, 8);
    return {
      jobTitle: pi.title ?? DEFAULTS.jobTitle,
      knowsAbout: primarySkills.length > 0 ? primarySkills : DEFAULTS.knowsAbout,
      occupationName: pi.title ?? DEFAULTS.occupationName,
    };
  } catch {
    return DEFAULTS;
  }
}

export const cv = loadCvData();
