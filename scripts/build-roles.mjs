// Builds src/data/roles.json: a curated list of common tech roles, followed by job titles for computer,
// IT and data occupations from the O*NET 31.0 Database by the U.S. Department of Labor, Employment and
// Training Administration (USDOL/ETA), used under CC BY 4.0. Titles are cleaned up and deduplicated.
// Run with: npm run build-roles
import { mkdir, writeFile } from 'node:fs/promises';
import { download, tsvRows, unzipEntry } from './unzip.mjs';

const ONET_VERSION = '31_0';
const ONET_ZIP = `https://www.onetcenter.org/dl_files/database/db_${ONET_VERSION}_text.zip`;
const OUTPUT = new URL('../src/data/roles.json', import.meta.url);

// O*NET-SOC codes for computer, IT, data and tech management occupations.
const OCCUPATIONS = [
  /^11-3021\./, // Computer and Information Systems Managers
  /^15-12(?!11\.01|99\.03)/, // Computer occupations, except Health Informatics and Document Management Specialists
  /^15-2051\.0[01]/, // Data Scientists, Business Intelligence Analysts
  /^17-2061\./, // Computer Hardware Engineers
];

// Military, clinical and overly vague titles that read oddly in a developer talent pool.
const EXCLUDED_TITLES =
  /nurse|physician|clinical|telehealth|law enforcement|counterintelligence|all-source|mission assessment|warning analyst|target (developer|network)|trend investigator|gamemaster|virus technician|language analyst|languages researcher|signal operations|^(engineer|administrator|scientist|designer|computer tech|is tech|it tech)$/i;

// Ordered roughly by how often developers search for them; these rank ahead of O*NET titles.
const CORE_ROLES = [
  'Software Engineer', 'Software Developer', 'Frontend Developer', 'Frontend Engineer', 'Backend Developer',
  'Backend Engineer', 'Full Stack Developer', 'Full Stack Engineer', 'Web Developer', 'Mobile Developer',
  'iOS Developer', 'Android Developer', 'React Developer', 'React Native Developer', 'Flutter Developer',
  'JavaScript Developer', 'TypeScript Developer', 'Node.js Developer', 'Python Developer', 'Java Developer',
  'Kotlin Developer', 'Swift Developer', 'C# Developer', '.NET Developer', 'C++ Developer', 'Go Developer',
  'Rust Developer', 'PHP Developer', 'Laravel Developer', 'Ruby on Rails Developer', 'Angular Developer',
  'Vue.js Developer', 'Scala Developer', 'Elixir Developer', 'DevOps Engineer', 'Site Reliability Engineer',
  'Platform Engineer', 'Cloud Engineer', 'Cloud Architect', 'Infrastructure Engineer', 'Solutions Architect',
  'Software Architect', 'Enterprise Architect', 'Data Engineer', 'Data Scientist', 'Data Analyst',
  'Analytics Engineer', 'Business Intelligence Developer', 'Machine Learning Engineer', 'AI Engineer',
  'MLOps Engineer', 'LLM Engineer', 'Prompt Engineer', 'Computer Vision Engineer', 'NLP Engineer',
  'Research Scientist', 'Research Engineer', 'QA Engineer', 'QA Automation Engineer', 'Test Automation Engineer',
  'Software Development Engineer in Test', 'Manual Tester', 'Security Engineer', 'Application Security Engineer',
  'Cloud Security Engineer', 'Security Analyst', 'Penetration Tester', 'SOC Analyst', 'Embedded Software Engineer',
  'Firmware Engineer', 'Hardware Engineer', 'Game Developer', 'Unity Developer', 'Unreal Engine Developer',
  'Blockchain Developer', 'Smart Contract Developer', 'Database Administrator', 'Database Engineer',
  'Systems Administrator', 'Network Engineer', 'Systems Engineer', 'IT Support Specialist', 'Help Desk Technician',
  'Salesforce Developer', 'SAP Consultant', 'ServiceNow Developer', 'WordPress Developer', 'Shopify Developer',
  'UI Developer', 'UX Designer', 'UI Designer', 'UI/UX Designer', 'Product Designer', 'UX Researcher',
  'Product Manager', 'Technical Product Manager', 'Product Owner', 'Project Manager', 'Technical Project Manager',
  'Program Manager', 'Scrum Master', 'Agile Coach', 'Business Analyst', 'Systems Analyst', 'Technical Writer',
  'Developer Advocate', 'Developer Relations Engineer', 'Solutions Engineer', 'Sales Engineer',
  'Customer Success Engineer', 'Technical Support Engineer', 'Release Engineer', 'Build Engineer',
  'Tech Lead', 'Team Lead', 'Engineering Manager', 'Director of Engineering', 'VP of Engineering',
  'Head of Engineering', 'CTO', 'IT Manager', 'Head of Data', 'Head of Product',
];

const SENIORITY = /^(intern|junior|mid-level|senior|lead|staff|principal)\s/i;

function clean(title) {
  return title
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\bFront[- ]?End\b/gi, 'Frontend')
    .replace(/\bBack[- ]?End\b/gi, 'Backend')
    .replace(/\bFull[- ]?Stack\b/gi, 'Full Stack')
    .replace(/\s+/g, ' ')
    .trim();
}

const zip = await download(ONET_ZIP);
const folder = `db_${ONET_VERSION}_text`;
const isTechOccupation = (code) => OCCUPATIONS.some((pattern) => pattern.test(code));

const reported = tsvRows(unzipEntry(zip, `${folder}/Sample of Reported Titles.txt`))
  .slice(1)
  .filter(([code]) => isTechOccupation(code))
  .map(([, title]) => title);

const jobTitles = tsvRows(unzipEntry(zip, `${folder}/Job Titles.txt`))
  .slice(1)
  .filter(([code]) => isTechOccupation(code))
  .map(([, title]) => title)
  .sort((a, b) => a.localeCompare(b));

const roles = [];
const seen = new Set();
for (const title of [...CORE_ROLES, ...reported.map(clean), ...jobTitles.map(clean)]) {
  const key = title.toLowerCase();
  // Seniority is added while searching, so the list only keeps the base role.
  if (title.length < 2 || SENIORITY.test(title) || EXCLUDED_TITLES.test(title) || seen.has(key)) continue;
  seen.add(key);
  roles.push(title);
}

await mkdir(new URL('.', OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify(roles));
console.log(`Wrote ${roles.length} roles (${CORE_ROLES.length} curated) to ${OUTPUT.pathname}`);
