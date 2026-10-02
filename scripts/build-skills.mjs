// Builds src/data/skills.json: a curated list of common developer skills, followed by the technologies
// used in computer, IT and data occupations from the O*NET 31.0 Database by the U.S. Department of Labor,
// Employment and Training Administration (USDOL/ETA), used under CC BY 4.0. Names are cleaned up and deduplicated.
// Run with: npm run build-skills
import { mkdir, writeFile } from 'node:fs/promises';
import { download, tsvRows, unzipEntry } from './unzip.mjs';

const ONET_VERSION = '31_0';
const ONET_ZIP = `https://www.onetcenter.org/dl_files/database/db_${ONET_VERSION}_text.zip`;
const OUTPUT = new URL('../src/data/skills.json', import.meta.url);

// Same occupations as build-roles.mjs.
const OCCUPATIONS = [/^11-3021\./, /^15-12(?!11\.01|99\.03)/, /^15-2051\.0[01]/, /^17-2061\./];

// Office, communication, classroom and back-office tools that are not useful to recruiters searching for developers.
const EXCLUDED_CATEGORIES = new Set([
  'Electronic mail software',
  'Word processing software',
  'Presentation software',
  'Office suite software',
  'Calendar and scheduling software',
  'Instant messaging software',
  'Video conferencing software',
  'Network conferencing software',
  'Desktop communications software',
  'Desktop publishing software',
  'Internet browser software',
  'Computer based training software',
  'Multi-media educational software',
  'Medical software',
  'Accounting software',
  'Financial analysis software',
  'Human resources software',
  'Time accounting software',
  'Billing and invoicing software',
  'Point of sale POS software',
  'Music or sound editing software',
  'Cloud-based data access and sharing software',
]);

// Generic words and consumer apps that slip through the category filter.
const EXCLUDED_NAMES = new Set([
  'tax', 'database', 'firewall', 'encryption', 'deployment', 'antivirus', 'anti-spyware', 'facebook', 'youtube',
  'skype', 'slack', 'dropbox', 'j', 'help desk', 'web browser', 'web server', 'web application', 'software libraries',
  'version control', 'microsoft teams', 'smugmug flickr', 'lexisnexis', 'mis', 'hrms', 'cadd', 'objective c',
  'blackboard', 'google sites', 'flipgrid', 'jamboard', 'screencastify', 'diagramming',
]);

const VENDORS = /^(Oracle|Microsoft|Google|Apache|Amazon|Amazon Web Services|AWS|IBM|Atlassian|Adobe|The MathWorks|Facebook|Meta|Red Hat|SAP|Apple)\s+/;
const MINOR_WORDS = new Set(['and', 'or', 'of', 'for', 'on', 'the', 'to', 'in', 'with', 'a']);

// Ordered roughly by popularity among developers; these rank ahead of O*NET technologies.
const CORE_SKILLS = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'SQL', 'HTML', 'CSS', 'Java', 'C#', 'C++', 'C', 'Go', 'Rust', 'PHP',
  'Kotlin', 'Swift', 'Ruby', 'Dart', 'Bash', 'PowerShell', 'Scala', 'R', 'Lua', 'Elixir', 'Haskell', 'Perl',
  'Objective-C', 'Clojure', 'Julia', 'Groovy', 'F#', 'Erlang', 'Solidity', 'Zig', 'OCaml', 'MATLAB', 'VBA',
  'COBOL', 'Fortran', 'Assembly', 'Visual Basic', 'Delphi', 'Apex', 'ABAP',
  // Frontend
  'React', 'Next.js', 'Vue.js', 'Nuxt', 'Angular', 'Svelte', 'SvelteKit', 'SolidJS', 'Remix', 'Astro', 'Gatsby',
  'jQuery', 'Redux', 'Zustand', 'MobX', 'RxJS', 'TanStack Query', 'Tailwind CSS', 'Sass', 'Bootstrap',
  'Material UI', 'Chakra UI', 'styled-components', 'shadcn/ui', 'Storybook', 'Webpack', 'Vite', 'Babel', 'esbuild',
  'Three.js', 'D3.js', 'WebGL', 'Web Components', 'htmx', 'Alpine.js', 'Ember.js', 'Responsive Design',
  'Web Accessibility', 'Progressive Web Apps', 'Figma',
  // Backend
  'Node.js', 'Express', 'NestJS', 'Fastify', 'Deno', 'Bun', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Spring',
  'Hibernate', '.NET', 'ASP.NET Core', 'Entity Framework', 'Laravel', 'Symfony', 'Ruby on Rails', 'Phoenix', 'Gin',
  'Ktor', 'Quarkus', 'Micronaut', 'gRPC', 'GraphQL', 'REST APIs', 'WebSockets', 'tRPC', 'Apollo GraphQL', 'Prisma',
  'Drizzle ORM', 'Sequelize', 'TypeORM', 'SQLAlchemy', 'Celery',
  // Mobile
  'React Native', 'Flutter', 'SwiftUI', 'UIKit', 'Jetpack Compose', 'Android SDK', 'iOS Development',
  'Android Development', 'Expo', 'Xamarin', '.NET MAUI', 'Ionic', 'Kotlin Multiplatform',
  // Data
  'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Microsoft SQL Server', 'Oracle Database', 'MariaDB',
  'Elasticsearch', 'DynamoDB', 'Cassandra', 'Firebase', 'Supabase', 'Snowflake', 'BigQuery', 'Amazon Redshift',
  'Databricks', 'Apache Spark', 'Kafka', 'RabbitMQ', 'Apache Airflow', 'dbt', 'Pandas', 'NumPy', 'Jupyter',
  'Power BI', 'Tableau', 'Looker', 'Excel', 'ETL', 'Data Modeling', 'Data Warehousing', 'Hadoop', 'Neo4j',
  'ClickHouse', 'Apache Flink',
  // AI and machine learning
  'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'scikit-learn', 'Keras', 'Hugging Face',
  'LangChain', 'LlamaIndex', 'LLMs', 'OpenAI API', 'Generative AI', 'Prompt Engineering', 'RAG',
  'Natural Language Processing', 'Computer Vision', 'MLOps', 'OpenCV', 'XGBoost', 'Vector Databases',
  // Cloud and DevOps
  'AWS', 'Microsoft Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Helm', 'CI/CD',
  'GitHub Actions', 'GitLab CI', 'Jenkins', 'CircleCI', 'Argo CD', 'Linux', 'Nginx', 'Serverless', 'AWS Lambda',
  'Amazon EC2', 'Amazon S3', 'Cloudflare', 'Vercel', 'Netlify', 'Heroku', 'DigitalOcean', 'Prometheus', 'Grafana',
  'Datadog', 'ELK Stack', 'OpenTelemetry', 'Pulumi', 'AWS CloudFormation', 'Puppet', 'Chef', 'Istio',
  'Infrastructure as Code', 'Site Reliability Engineering', 'Observability',
  // Testing
  'Jest', 'Vitest', 'Cypress', 'Playwright', 'Selenium', 'Testing Library', 'Mocha', 'JUnit', 'pytest', 'Postman',
  'Unit Testing', 'Integration Testing', 'End-to-End Testing', 'TDD', 'BDD', 'Cucumber', 'Appium', 'k6', 'JMeter',
  // Practices and tools
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Agile', 'Scrum', 'Kanban', 'Microservices',
  'System Design', 'Software Architecture', 'Design Patterns', 'Object-Oriented Programming',
  'Functional Programming', 'Data Structures and Algorithms', 'Domain-Driven Design', 'Event-Driven Architecture',
  'Clean Code', 'Code Review', 'API Design', 'OAuth', 'JWT', 'Web Security', 'OWASP', 'Cybersecurity',
  'Penetration Testing', 'Networking', 'TCP/IP', 'Linux Administration', 'Shell Scripting',
  // Embedded, games and platforms
  'Embedded Systems', 'RTOS', 'IoT', 'Arduino', 'Raspberry Pi', 'FPGA', 'Verilog', 'VHDL', 'Blockchain', 'Ethereum',
  'Web3', 'Unity', 'Unreal Engine', 'Godot', 'Game Development', 'WordPress', 'Shopify', 'Salesforce', 'SAP',
  'ServiceNow', 'Microsoft Dynamics 365', 'SharePoint', 'Power Apps', 'Power Automate', 'UI Design', 'UX Design',
  'Product Management', 'Technical Writing',
];

function initials(words) {
  return words
    .filter((word) => !MINOR_WORDS.has(word.toLowerCase()))
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * Turns O*NET names into the names developers use: "Structured query language SQL" becomes "SQL",
 * "Microsoft SQL Server Reporting Services SSRS" becomes "Microsoft SQL Server Reporting Services (SSRS)".
 * Returns null for generic descriptions such as "Relational database management software" or "Load testing".
 */
function clean(name) {
  const words = name.replace(/\s+software$/i, '').trim().split(/\s+/);
  const last = words.at(-1);
  const hasAcronym = words.length > 1 && /^[A-Z][A-Z0-9.+#/-]+$/.test(last);
  const rest = hasAcronym ? words.slice(0, -1) : words;

  if (hasAcronym && initials(rest) === last.replace(/[^A-Z]/g, '')) return { label: last, acronym: last };
  const lowercaseWords = rest.slice(1).filter((word) => /^[a-z]/.test(word) && !MINOR_WORDS.has(word)).length;
  if (lowercaseWords >= 1) return null;
  // Only long spelled-out names get the acronym in brackets; "Oracle PL/SQL" and "Jenkins CI" stay as they are.
  const label = hasAcronym && rest.length >= 3 ? `${rest.join(' ')} (${last})` : words.join(' ');
  return { label, acronym: hasAcronym ? last : undefined };
}

const zip = await download(ONET_ZIP);
const technologies = tsvRows(unzipEntry(zip, `db_${ONET_VERSION}_text/Software Skills.txt`))
  .slice(1)
  .filter(([code, , , category]) => OCCUPATIONS.some((pattern) => pattern.test(code)) && !EXCLUDED_CATEGORIES.has(category));

// Rank O*NET technologies by how many tech occupations use them.
const usage = new Map();
for (const [, name] of technologies) usage.set(name, (usage.get(name) ?? 0) + 1);
const ranked = [...usage.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);

const skills = [];
const seen = new Set();
const keep = (label) => {
  const key = label.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  skills.push(label);
};

CORE_SKILLS.forEach(keep);
for (const name of ranked) {
  const cleaned = clean(name);
  if (!cleaned || EXCLUDED_NAMES.has(cleaned.label.toLowerCase())) continue;
  if (cleaned.acronym && seen.has(cleaned.acronym.toLowerCase())) continue;
  const withoutVendor = cleaned.label.replace(VENDORS, '');
  if (withoutVendor !== cleaned.label && seen.has(withoutVendor.toLowerCase())) continue;
  keep(cleaned.label);
}

await mkdir(new URL('.', OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify(skills));
console.log(`Wrote ${skills.length} skills (${CORE_SKILLS.length} curated) to ${OUTPUT.pathname}`);
